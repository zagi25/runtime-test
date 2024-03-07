/* 
* <license header>
*/

/* This file exposes some common utilities for your actions */

const crypto = require('crypto');
const { getCliEnv } = require('@adobe/aio-lib-env')

/**
 *
 * Returns a log ready string of the action input parameters.
 * The `Authorization` header content will be replaced by '<hidden>'.
 *
 * @param {object} params action input parameters.
 *
 * @returns {string}
 *
 */
function stringParameters (params) {
  // hide authorization token without overriding params
  let headers = params.__ow_headers || {}
  if (headers.authorization) {
    headers = { ...headers, authorization: '<hidden>' }
  }
  return JSON.stringify({ ...params, __ow_headers: headers })
}

/**
 *
 * Returns the list of missing keys giving an object and its required keys.
 * A parameter is missing if its value is undefined or ''.
 * A value of 0 or null is not considered as missing.
 *
 * @param {object} obj object to check.
 * @param {array} required list of required keys.
 *        Each element can be multi level deep using a '.' separator e.g. 'myRequiredObj.myRequiredKey'
 *
 * @returns {array}
 * @private
 */
function getMissingKeys (obj, required) {
  return required.filter(r => {
    const splits = r.split('.')
    const last = splits[splits.length - 1]
    const traverse = splits.slice(0, -1).reduce((tObj, split) => { tObj = (tObj[split] || {}); return tObj }, obj)
    return traverse[last] === undefined || traverse[last] === '' // missing default params are empty string
  })
}

/**
 *
 * Returns the list of missing keys giving an object and its required keys.
 * A parameter is missing if its value is undefined or ''.
 * A value of 0 or null is not considered as missing.
 *
 * @param {object} params action input parameters.
 * @param {array} requiredHeaders list of required input headers.
 * @param {array} requiredParams list of required input parameters.
 *        Each element can be multi level deep using a '.' separator e.g. 'myRequiredObj.myRequiredKey'.
 *
 * @returns {string} if the return value is not null, then it holds an error message describing the missing inputs.
 *
 */
function checkMissingRequestInputs (params, requiredParams = [], requiredHeaders = []) {
  let errorMessage = null

  // input headers are always lowercase
  requiredHeaders = requiredHeaders.map(h => h.toLowerCase())
  // check for missing headers
  const missingHeaders = getMissingKeys(params.__ow_headers || {}, requiredHeaders)
  if (missingHeaders.length > 0) {
    errorMessage = `missing header(s) '${missingHeaders}'`
  }

  // check for missing parameters
  const missingParams = getMissingKeys(params, requiredParams)
  if (missingParams.length > 0) {
    if (errorMessage) {
      errorMessage += ' and '
    } else {
      errorMessage = ''
    }
    errorMessage += `missing parameter(s) '${missingParams}'`
  }

  return errorMessage
}

/**
 *
 * Extracts the bearer token string from the Authorization header in the request parameters.
 *
 * @param {object} params action input parameters.
 *
 * @returns {string|undefined} the token string or undefined if not set in request headers.
 *
 */
function getBearerToken (params) {
  if (params.__ow_headers &&
      params.__ow_headers.authorization &&
      params.__ow_headers.authorization.startsWith('Bearer ')) {
    return params.__ow_headers.authorization.substring('Bearer '.length)
  }
  return undefined
}

function getCookies (params) {
  const cookies = {};
  if (params.__ow_headers &&
      params.__ow_headers.cookie) {

    params.__ow_headers.cookie.split(';').forEach((cookie) => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    })
  }

  return cookies;
}

/**
 *
 * Returns an error response object and attempts to log.info the status code and error message
 *
 * @param {number} statusCode the error status code.
 *        e.g. 400
 * @param {string} message the error message.
 *        e.g. 'missing xyz parameter'
 * @param {*} [logger] an optional logger instance object with an `info` method
 *        e.g. `new require('@adobe/aio-sdk').Core.Logger('name')`
 *
 * @returns {object} the error object, ready to be returned from the action main's function.
 *
 */
function errorResponse (statusCode, message, logger) {
  if (logger && typeof logger.info === 'function') {
    logger.info(`${statusCode}: ${message}`)
  }
  return {
    error: {
      statusCode,
      body: {
        error: message
      }
    }
  }
}

function parseErrorMessage(message) {
  const regex = /^(2\d{2}|3\d{2}|4\d{2})\s\(.+\)$/;
  const isRequestMessage = regex.test(message);
  let errorStatus = 500;
  let errorMessage = 'Server Error';
  if (isRequestMessage) {
    [errorStatus, errorMessage] = message.replace(/[()]/g, '').split(' ');
  }

  return {
    requestError: isRequestMessage,
    errorStatus,
    errorMessage,
  }
}

function returnError( error, logger) {
  const { requestError, errorStatus, errorMessage } = parseErrorMessage(error.message);
  if (!requestError) {
    logger.error(error);
  }
  return errorResponse(errorStatus, errorMessage, logger);
}

function JSONToBase64( data ) {
  const ENCRYPTION_METHOD='aes-256-cbc';
  const ENCRYPTION_KEY='e96e342bb53dc1133e87dff56a9049ed';
  const ENCRYPTION_IV='e5d7614486b44f40';

  const cipher = crypto.createCipheriv(ENCRYPTION_METHOD, Buffer.from(ENCRYPTION_KEY), Buffer.from(ENCRYPTION_IV));
  const encrypted = cipher.update(Buffer.from(JSON.stringify(data)));
  return result = Buffer.concat([encrypted, cipher.final()]).toString('base64')
}

function Base64ToJSON( data ) {
  const ENCRYPTION_METHOD='aes-256-cbc';
  const ENCRYPTION_KEY='e96e342bb53dc1133e87dff56a9049ed';
  const ENCRYPTION_IV='e5d7614486b44f40';

  const decipher = crypto.createDecipheriv(ENCRYPTION_METHOD, Buffer.from(ENCRYPTION_KEY), Buffer.from(ENCRYPTION_IV));
  let decrypted = decipher.update(Buffer.from(data, 'base64'));
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString());
}

function getClientId() {
  const env = getCliEnv();
  const CLIENT_ID = {
    'stage': 'APP_GRAVITY_RUNTIME',
    'prod': 'APP_GRAVITY_RUNTIME_TEST_PROD'
  };

  return CLIENT_ID[env];
}

function getRequestBody( params ) {
  if (!params?.__ow_body) return {};
  try {
    const body = JSON.parse(params.__ow_body);
    return body;
  } catch (e) {
    return params.__ow_body;
  }
}

module.exports = {
  errorResponse,
  getBearerToken,
  stringParameters,
  checkMissingRequestInputs,
  JSONToBase64,
  Base64ToJSON,
  getCookies,
  getClientId,
  getRequestBody,
  returnError
}
