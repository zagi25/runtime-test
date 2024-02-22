const fetch = require('node-fetch');
const { Core } = require('@adobe/aio-sdk');
const { errorResponse, getBearerToken, stringParameters, JSONToBase64, Base64ToJSON } = require('../utils');
const { Ims } = require('@adobe/aio-lib-ims');

// main function that will be executed by Adobe I/O Runtime
async function main ( params ) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  const CLIENT_ID_STAGE='APP_GRAVITY_RUNTIME';
  const CLIENT_ID_PROD='APP_GRAVITY_RUNTIME_TEST_PROD';
  const SCOPES='openid,AdobeID,session';
  const CLIENT_SECRET_PROD='p8e-sHImkEfXhVWKBTIEQp3HMmIQNv8Xe80b';
  const CLIENT_SECRET_STAGE= 's8e-fdsKA6dZCvVeOPVGcsxvdGYkfuCnzZkj';

  try {
    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    const authCode = getBearerToken(params);
    let partnerData = params.partner_token;

    if (!partnerData && !authCode) {
      return errorResponse(401, 'Bad request', logger);
    }

    let pageLevel = params.page_level?.split(',');
    let partnerLevel = '';

    const ims = new Ims('prod')
    // Retrive partner data form partner service
    if (!partnerData && authCode) {
      const { payload } = await ims.getAccessToken(authCode, CLIENT_ID_PROD, CLIENT_SECRET_PROD, SCOPES);
      const { spp_partner_level } = await (await fetch(`https://partnerservices-va6.cloud.adobe.io/apis/partner?email=${payload['email']}&programType=SPP`, 
        {
          headers: {
            'x-user-token': payload['access_token'],
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + payload['access_token'],
          }
        },)).json();
      // Encrypt data
      partnerData = JSONToBase64({authId: payload['authId'], spp_partner_level});
      partnerLevel = spp_partner_level;
    } 

    // Decrypt data
    if (partnerData) {
      const { spp_partner_level } = Base64ToJSON(partnerData);
      partnerLevel = spp_partner_level;
    }

    // Compare partner level to page level
    if (pageLevel && !pageLevel.includes(partnerLevel.toLowerCase())) {
      return errorResponse(401, 'Not Allowed', logger);
    }

    return {
      statusCode: 200,
      body: {
        partnerData,
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


