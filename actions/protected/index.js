const fetch = require('node-fetch');
const crypto = require('crypto');
const { Core } = require('@adobe/aio-sdk');
const { errorResponse, getBearerToken, stringParameters, JSONToBase64 } = require('../utils');
const { getTokenData, Ims } = require('@adobe/aio-lib-ims');

// main function that will be executed by Adobe I/O Runtime
async function main ( params ) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // if (!params.email || !params.authId) {
    //   return errorResponse(400, 'Bad request', logger);
    // }

    const imsUserToken = getBearerToken(params);
    const { client_id } = getTokenData(imsUserToken);
    const ims = new Ims('prod');
    const { email, authId } = await ims.get('/ims/profile', imsUserToken, {client_id});
    const { spp_partner_level } = await (await fetch(`https://partnerservices-stage-va6.stage.cloud.adobe.io/apis/partner?email=${email}&programType=SPP`, 
      {
        headers: {
          'x-user-token': imsUserToken,
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + imsUserToken,
        }
      },)).json();
    const result = JSONToBase64({authId, spp_partner_level});

    return {
      partnerData : result,
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


