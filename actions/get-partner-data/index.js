const fetch = require('node-fetch');
const crypto = require('crypto');
const { Core } = require('@adobe/aio-sdk');
const { errorResponse, getBearerToken, stringParameters, JSONToBase64 } = require('../utils');
const { Ims } = require('@adobe/aio-lib-ims');

// main function that will be executed by Adobe I/O Runtime
async function main ( params ) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  const CLIENT_ID_STAGE='APP_GRAVITY_RUNTIME';
  const CLIENT_ID_PROD='APP_GRAVITY_RUNTIME_TEST_PROD';
  const SCOPES='openid,AdobeID';
  const CLIENT_SECRET_PROD='p8e-sHImkEfXhVWKBTIEQp3HMmIQNv8Xe80b';
  const CLIENT_SECRET_STAGE= 's8e-fdsKA6dZCvVeOPVGcsxvdGYkfuCnzZkj';

  try {
    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    if (!params.code) {
      return errorResponse(400, 'Bad request', logger);
    }

    const ims = new Ims('prod')
    const { payload } = await ims.getAccessToken(params.code, CLIENT_ID_PROD, CLIENT_SECRET_PROD, SCOPES);
    const { spp_partner_level } = await (await fetch(`https://partnerservices-va6.cloud.adobe.io/apis/partner?email=${payload['email']}&programType=SPP`, 
      {
        headers: {
          'x-user-token': payload['access_token'],
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + payload['access_token'],
        }
      },)).json();

    const result = JSONToBase64({authId: payload['authId'], spp_partner_level});

    return {
      statusCode: 200,
      body: {
        partnerData : result,
      }
    }
  } catch (error) {
    // log any server errors
    logger.error(error)
    if (error.message.includes('401')) {
      return errorResponse(401, 'Unauthorized', logger);
    }
    // return with 500
    return errorResponse(500, 'server error', logger);
  }
}

exports.main = main


