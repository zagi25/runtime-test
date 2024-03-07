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
const { errorResponse, getCookies } = require('../utils')
const { getCliEnv } = require('@adobe/aio-lib-env')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  logger.info('Successful deploy'); 

  const env = getCliEnv();
  const CLIENT_ID = env === 'stage' ? 'APP_GRAVITY_RUNTIME' : 'APP_GRAVITY_RUNTIME_TEST_PROD';
  const SCOPES='openid,AdobeID';

  try {
    const pageUrl = params.page;
    const LOGIN_URL = `https://ims-na1${env === 'stage' ? '-stg1' : ''}.adobelogin.com/ims/authorize/v2?redirect_uri=https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/edge-worker?page=https://test-branch3--dx-partners--adobecom.hlx.page/SPP/drafts/ratko/public&client_id=${CLIENT_ID}&scope=${SCOPES}&response_type=token`;
    const page = await fetch(pageUrl);
    const pageLevel = page.headers.get('partner-level') ?? '';
    const pageResponse = await page.text();

    // If page is public we just return the page
    if (!pageLevel || pageLevel === 'public') {
      return {
        statusCode: 200,
        body: pageResponse,
      }
    }

    const cookies = getCookies(params);
    const partnerToken = cookies['partner_token'] ?? '';
    const auxSid = cookies['aux_sid'] ?? '';

    // If page is not public and there is no partner_token cookie we redirect user to IMS login page
    if (!partnerToken && !auxSid) {
      return {
        statusCode: 301,
        body: '',
        headers: {
          Location: LOGIN_URL,
        }
      }
    }

    // let accessToken;
    // if (!partnerToken) {
    //   const accessTokenResponse = await fetch('https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/auth-user', {
    //     headers: {
    //       'X-OW-EXTRA-LOGGING': 'on',
    //     },
    //     method: "POST",
    //     body: JSON.stringify({auxSid})
    //   });

    //   if (!accessTokenResponse.ok) {
    //     const accessTokenError = await accessTokenResponse.json();
    //     return errorResponse(accessTokenResponse.status, accessTokenError.error, logger);
    //   }
    //   ({ accessToken } = await accessTokenResponse.json());
    // }

    const partnerDataResponse = await fetch('https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/get-partner-data', {
      method: "POST",
      body: JSON.stringify({partnerToken, pageLevel, auxSid})
    });
    if (!partnerDataResponse.ok) {
      const partnerDataError = await partnerDataResponse.json();
      return errorResponse(partnerDataResponse.status, partnerDataError.error, logger);
    }

    const { partnerData } = await partnerDataResponse.json();

    return {
      statusCode: 200,
      body: '',
      headers: {
        'Set-Cookie': `partner_token=${partnerData}; Path=/; HttpOnly; Secure; SameSite=None; Domain=.14257-ratkotest-dev.adobeioruntime.net; Max-Age=31556952`,
      },
      body: pageResponse,
    }
  } catch (error) {
    // log any server errors
    // return with 500
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
