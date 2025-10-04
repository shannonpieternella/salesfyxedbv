const VoiceCall = require('../models/VoiceCall');
const User = require('../models/User');
const { CreditTransaction } = require('../models/Credit');
const VapiClient = require('./vapi');

class CallUpdater {
  constructor() {
    this.vapi = new VapiClient();
    this.updateInterval = 30000; // Check every 30 seconds
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;

    console.log('🔄 Call Updater gestart - controleert calls elke 30 seconden');
    this.isRunning = true;

    // Start immediately
    this.checkPendingCalls();

    // Then check every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkPendingCalls();
    }, this.updateInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Call Updater gestopt');
  }

  async checkPendingCalls() {
    try {
      // Find calls that are not ended/failed OR ended but not yet billed (cost = 0), created in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const pendingCalls = await VoiceCall.find({
        $or: [
          { status: { $nin: ['ended', 'failed'] } }, // Still in progress
          { status: 'ended', cost: 0 } // Ended but not yet billed
        ],
        createdAt: { $gte: oneHourAgo }
      }).populate('user', 'credits');

      console.log(`🔍 Checking ${pendingCalls.length} pending calls...`);

      for (const call of pendingCalls) {
        await this.updateCallStatus(call);
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('❌ Fout bij controleren pending calls:', error);
    }
  }

  async updateCallStatus(call) {
    try {
      // Get call status from Vapi API
      const vapiCall = await this.vapi.getCall(call.vapiCallId);

      if (!vapiCall) {
        console.log(`⚠️ Call ${call.vapiCallId} niet gevonden in Vapi`);
        return;
      }

      // Check if status changed OR if call ended but not yet billed
      const statusChanged = vapiCall.status !== call.status;
      const needsBilling = vapiCall.status === 'ended' && call.cost === 0;

      if (statusChanged || needsBilling) {
        if (statusChanged) {
          console.log(`📞 Updating call ${call.vapiCallId}: ${call.status} → ${vapiCall.status}`);

          // Update basic status
          call.status = vapiCall.status;
          call.startedAt = vapiCall.startedAt ? new Date(vapiCall.startedAt) : call.startedAt;
          call.endedAt = vapiCall.endedAt ? new Date(vapiCall.endedAt) : call.endedAt;
          call.endedReason = vapiCall.endedReason || call.endedReason;
        }

        // If call ended and not yet billed, process billing
        if (vapiCall.status === 'ended' && call.cost === 0) {
          console.log(`💰 Call ended, processing billing for call ${call.vapiCallId}`);
          await this.processCallBilling(call, vapiCall);
        } else if (vapiCall.status === 'ended' && call.cost > 0) {
          console.log(`⏭️ Call ${call.vapiCallId} already billed (€${call.cost.toFixed(2)}), skipping`);
        }

        if (statusChanged || needsBilling) {
          await call.save();
        }
      } else {
        console.log(`⏭️ Call ${call.vapiCallId} unchanged (${call.status}, €${call.cost.toFixed(2)})`);
      }
    } catch (error) {
      console.error(`❌ Fout bij updaten call ${call.vapiCallId}:`, error.message);
    }
  }

  async processCallBilling(call, vapiCall) {
    try {
      // Calculate duration and cost - only if call actually connected
      const duration = vapiCall.endedAt && vapiCall.startedAt
        ? Math.floor((new Date(vapiCall.endedAt) - new Date(vapiCall.startedAt)) / 1000)
        : 0;

      // Only charge if duration > 0 (actual conversation happened)
      if (duration <= 0) {
        console.log(`⚠️ No billable duration for call ${call.vapiCallId} (${duration}s)`);
        call.duration = 0;
        call.cost = 0;
        return;
      }

      const minutes = Math.ceil(duration / 60);
      const cost = minutes * 0.5; // 0.5 credits per minute (€0.50)

      // Update call record
      call.duration = duration;
      call.cost = cost;

      console.log(`💰 Processing billing: ${minutes} minutes = €${cost.toFixed(2)}`);

      // Deduct credits from user balance
      if (cost > 0 && call.user) {
        const user = await User.findById(call.user);
        if (user && user.credits) {
          const oldBalance = user.credits.balance;
          user.credits.balance = user.credits.balance - cost; // Allow negative balance
          user.credits.totalUsed += cost;
          await user.save();

          // Create transaction record
          await new CreditTransaction({
            user: call.user,
            type: 'usage',
            amount: -cost,
            description: `Gesprek van ${minutes} ${minutes === 1 ? 'minuut' : 'minuten'} (€${cost.toFixed(2)})`,
            relatedCall: call._id,
            balanceAfter: user.credits.balance
          }).save();

          console.log(`✅ Budget afgetrokken: €${oldBalance.toFixed(2)} → €${user.credits.balance.toFixed(2)} (€${cost.toFixed(2)})`);
        }
      }
    } catch (error) {
      console.error('❌ Fout bij billing verwerking:', error);
    }
  }
}

// Export singleton instance
const callUpdater = new CallUpdater();
module.exports = callUpdater;