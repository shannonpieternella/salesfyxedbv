const fetch = require('node-fetch');

class VapiClient {
  constructor() {
    this.apiKey = process.env.VAPI_API_KEY;
    this.baseUrl = 'https://api.vapi.ai';

    if (!this.apiKey) {
      throw new Error('VAPI_API_KEY environment variable is required');
    }
  }

  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
    }

    return responseData;
  }

  // Create or get assistant
  async createAssistant(assistantConfig) {
    return await this.makeRequest('/assistant', 'POST', assistantConfig);
  }

  // Start an outbound call
  async createCall(callConfig) {
    return await this.makeRequest('/call', 'POST', callConfig);
  }

  // Get call details
  async getCall(callId) {
    return await this.makeRequest(`/call/${callId}`);
  }

  // Get call recording
  async getCallRecording(callId) {
    return await this.makeRequest(`/call/${callId}/recording`);
  }

  // Get call transcript
  async getCallTranscript(callId) {
    return await this.makeRequest(`/call/${callId}/transcript`);
  }

  // Get phone numbers
  async getPhoneNumbers() {
    return await this.makeRequest('/phone-number');
  }

  // Get all assistants from Vapi account
  async getAssistants() {
    return await this.makeRequest('/assistant');
  }

  // Build assistant configuration from our agent model
  buildAssistantConfig(agent) {
    return {
      name: agent.name,
      model: {
        provider: agent.model.provider,
        model: agent.model.model,
        temperature: agent.model.temperature,
        messages: [
          {
            role: "system",
            content: agent.systemPrompt
          }
        ]
      },
      voice: {
        provider: agent.voice.provider,
        voiceId: agent.voice.voiceId,
        stability: agent.voice.stability,
        similarityBoost: agent.voice.similarityBoost
      },
      recordingEnabled: agent.callSettings.recordCalls,
      endCallFunctionEnabled: true,
      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "nl"
      },
      maxDurationSeconds: agent.callSettings.maxDuration,
      backgroundSound: "office",
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
      modelOutputInMessagesEnabled: true
    };
  }

  // Build call configuration
  buildCallConfig(agent, phoneNumber, assistantId = null) {
    const config = {
      phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
      customer: {
        number: phoneNumber
      }
    };

    if (assistantId) {
      config.assistantId = assistantId;
    } else {
      config.assistant = this.buildAssistantConfig(agent);
    }

    return config;
  }
}

module.exports = VapiClient;