/*
* <license header>
*/

/**
 * This is a sample action showcasing how to access an external API
 *
 * Note:
 * You might want to disable authentication and authorization checks against Adobe Identity Management System for a generic action. In that case:
 *   - Remove the require-adobe-auth annotation for this action in the manifest.yml of your application
 *   - Remove the Authorization header from the array passed in checkMissingRequestInputs
 *   - The two steps above imply that every client knowing the URL to this deployed action will be able to invoke it without any authentication and authorization checks against Adobe Identity Management System
 *   - Make sure to validate these changes against your security requirements before deploying the action
 */


const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')
const { Ims, ValidationCache, getToken } = require('@adobe/aio-lib-ims')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action');

    const imsUserToken = getBearerToken(params);

    const CACHE_MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
    const VALID_CACHE_ENTRIES = 10000
    const INVALID_CACHE_ENTRIES = 20000
    const cache = new ValidationCache(CACHE_MAX_AGE_MS, VALID_CACHE_ENTRIES, INVALID_CACHE_ENTRIES)
    const ims = new Ims('prod')

    const imsValidation = await ims.validateToken(imsUserToken)
    logger.info(imsValidation);
    if (!imsValidation.valid) {
      const response = {
        statusCode: 401,
      }
      return response;
    }
    const partnerData = await (await fetch('https://partnerservices-stage-va6.stage.cloud.adobe.io/apis/partner?email=yugo-stage-spp-gold@yopmail.com&programType=SPP', 
      {
        headers: {
          'x-user-token': imsUserToken,
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + imsUserToken,
        }
      },)).json();
    logger.info('requested data from partner service');
    logger.info(partnerData);
    return {
      statusCode: 200,
      body: partnerData
    };

  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
