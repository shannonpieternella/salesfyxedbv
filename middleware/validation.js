const { body, param, query, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validatiefout',
      details: errors.array()
    });
  }
  next();
}

const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Naam moet tussen 2 en 100 karakters zijn'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geldig emailadres vereist'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Wachtwoord moet minimaal 6 karakters zijn'),
  body('role')
    .isIn(['owner', 'leader', 'agent'])
    .withMessage('Geldige rol vereist'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Geldig telefoonnummer vereist'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geldig emailadres vereist'),
  body('password')
    .notEmpty()
    .withMessage('Wachtwoord vereist'),
  handleValidationErrors
];

const validateSale = [
  body('sellerId')
    .isMongoId()
    .withMessage('Geldige verkoper ID vereist'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Bedrag moet groter dan 0 zijn'),
  body('currency')
    .optional()
    .isIn(['EUR', 'USD', 'GBP'])
    .withMessage('Geldige valuta vereist'),
  body('customer.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Klantnaam mag maximaal 200 karakters zijn'),
  body('meta.source')
    .optional()
    .isIn(['lead-activation', 'retainer', 'custom', 'stripe-payment', 'manual-invoice'])
    .withMessage('Geldige bron vereist'),
  handleValidationErrors
];

const validateInvoice = [
  body('sellerId')
    .isMongoId()
    .withMessage('Geldige verkoper ID vereist'),
  body('customer.name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Klantnaam vereist (max 200 karakters)'),
  body('customer.email')
    .optional()
    .isEmail()
    .withMessage('Geldig emailadres vereist'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Minimaal 1 factuuritem vereist'),
  body('items.*.description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Itembeschrijving vereist (max 500 karakters)'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Aantal moet minimaal 1 zijn'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Prijs per eenheid moet groter dan 0 zijn'),
  handleValidationErrors
];

const validateTeam = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Teamnaam moet tussen 2 en 100 karakters zijn'),
  body('leaderId')
    .isMongoId()
    .withMessage('Geldige teamleider ID vereist'),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('Teamleden moet een array zijn'),
  body('memberIds.*')
    .optional()
    .isMongoId()
    .withMessage('Geldige teamlid ID vereist'),
  handleValidationErrors
];

const validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Bedrag moet minimaal €0.01 zijn'),
  body('currency')
    .optional()
    .isIn(['eur', 'usd', 'gbp'])
    .withMessage('Geldige valuta vereist'),
  body('sellerId')
    .isMongoId()
    .withMessage('Geldige verkoper ID vereist'),
  body('customerInfo.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Klantnaam mag maximaal 200 karakters zijn'),
  handleValidationErrors
];

const validatePeriod = [
  query('month')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Maand moet tussen 1 en 12 zijn'),
  query('year')
    .optional()
    .isInt({ min: 2020, max: 2030 })
    .withMessage('Jaar moet tussen 2020 en 2030 zijn'),
  handleValidationErrors
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Geldige startdatum vereist (ISO8601 formaat)'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Geldige einddatum vereist (ISO8601 formaat)'),
  handleValidationErrors
];

const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Geldige ID vereist'),
  handleValidationErrors
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateSale,
  validateInvoice,
  validateTeam,
  validatePayment,
  validatePeriod,
  validateDateRange,
  validateObjectId,
  handleValidationErrors
};