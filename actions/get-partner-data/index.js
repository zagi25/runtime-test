const fetch = require('node-fetch');
const { Core } = require('@adobe/aio-sdk');
const { errorResponse, getRequestBody, JSONToBase64, Base64ToJSON, getClientId } = require('../utils');
const { Ims } = require('@adobe/aio-lib-ims');
const { getCliEnv } = require('@adobe/aio-lib-env')

// main function that will be executed by Adobe I/O Runtime
async function main ( params ) {
  // create a Logger
  const env = getCliEnv();
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })
  const CLIENT_ID = getClientId();
  const SCOPES='openid,AdobeID';
  const CLIENT_SECRET= env === 'stage' ? 's8e-fdsKA6dZCvVeOPVGcsxvdGYkfuCnzZkj' : 'p8e-sHImkEfXhVWKBTIEQp3HMmIQNv8Xe80b';

  try {
    // log parameters, only if params.LOG_LEVEL === 'debug'
    const data = getRequestBody(params);
    const pageLevel = data.pageLevel?.split(',');
    let partnerData = data.partnerToken;
    const auxSid = data.auxSid

    if (!partnerData && !auxSid && !pageLevel) {
      return errorResponse(400, 'Bad request', logger);
    }

    let partnerLevel = '';

    // Retrive partner data form partner service
    if (!partnerData && auxSid) {
      // Set env
      const ims = new Ims(env)
      const { access_token: accessToken }  = await ims.post('/ims/token/v1', undefined, {
        grant_type: 'aux_sid_exchange',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        aux_sid: auxSid,
        scope: SCOPES,
      });
      const { email, authId } = await ims.get(`/ims/profile/v1?client_id=${CLIENT_ID}`, accessToken);
      // Turn into seperate class similar to Ims
      const partnerServiceResponse = await fetch(`https://partnerservices${env === 'stage' ? '-stage' :''}-va6.${env === 'stage' ? 'stage.' : ''}cloud.adobe.io/apis/partner?email=${email}&programType=SPP`, 
        {
          headers: {
            'x-user-token': accessToken,
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + accessToken,
          }
        });

      if (!partnerServiceResponse.ok) {
        return errorResponse(404, 'Not a partner', logger);
      }

      const { spp_partner_level } = await partnerServiceResponse.json();
      // Encrypt data
      partnerData = JSONToBase64({authId, spp_partner_level});
      partnerLevel = spp_partner_level;
    } 

    // Decrypt data
    if (partnerData) {
      const { spp_partner_level } = Base64ToJSON(partnerData);
      partnerLevel = spp_partner_level;

    }

    if (!pageLevel.includes(partnerLevel.toLowerCase()) || !partnerLevel) {
      return errorResponse(401, 'Low level', logger);
    }

    return {
      statusCode: 200,
      body: {
        partnerData,
      }
    }
  } catch (error) {
    // log any server errors
    logger.info(error);
    if (error.message.includes('401')) {
      return errorResponse(401, 'Unauthorized', logger);
    }

    return errorResponse(500, 'server error', logger);
  }
}

exports.main = main


