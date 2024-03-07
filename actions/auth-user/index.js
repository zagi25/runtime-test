const fetch = require('node-fetch');
const { Core } = require('@adobe/aio-sdk');
const { errorResponse, getCookies, stringParameters } = require('../utils');
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
    const data = JSON.parse(params.__ow_body);
    const auxSid = data.auxSid;

    if (!auxSid) {
      return errorResponse(400, 'Bad request', logger);
    }

    const ims = new Ims('prod')
    const { access_token: accessToken }  = await ims.post('/ims/token/v1', undefined, {
      grant_type: 'aux_sid_exchange',
      client_id: CLIENT_ID_PROD,
      client_secret: CLIENT_SECRET_PROD,
      aux_sid: auxSid,
      scope: SCOPES,
    });

    return {
      statusCode: 200,
      body: {
        accessToken
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


