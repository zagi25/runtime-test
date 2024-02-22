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
const { Ims } = require('@adobe/aio-lib-ims')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  const CLIENT_ID_STAGE='APP_GRAVITY_RUNTIME';
  const CLIENT_ID_PROD='APP_GRAVITY_RUNTIME_TEST_PROD';
  const SCOPES='openid,AdobeID,session';
  const LOGIN_URL = `https://ims-na1.adobelogin.com/ims/authorize/v2?redirect_uri=https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/edge-worker?page=login&client_id=${CLIENT_ID_PROD}&scope=${SCOPES}&response_type=code`;

  try {
    logger.info('Calling the main action');
    const pageUrl = params.page;
    let page = '';
    let partnerToken = '';
    let pageLevel = '';

    // Dummy page URL that user redirects to after login
    // Here we will use Authorization Code to get access_token and to call partner service to obtain partner level
    if (pageUrl === 'login' && params.code) {
      const authCode = params.code;
      const partnerDataResponse = await fetch(`https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/get-partner-data`, {
        headers: {
          'X-OW-EXTRA-LOGGING': 'on',
          Authorization: `Bearer ${authCode}`
        }
      });

      if (!partnerDataResponse.ok) {
        return {
          statusCode: 401,
          body: '<h1>Not partner</h1>'
        }
      }

      // If all operations are successfull we redirect the user to the desired page and set partner_token for further use
      const { partnerData } = await partnerDataResponse.json();
      return {
        statusCode: 301,
        body: '',
        headers: {
          'Set-Cookie': `partner_token=${partnerData}; Path=/; HttpOnly; Secure; SameSite=None; Domain=.14257-ratkotest-dev.adobeioruntime.net; Max-Age=31556952`,
          Location:`https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/edge-worker?page=${params.state}`
        }
      }
    }

    page = await fetch(pageUrl);
    pageLevel = page.headers.get('partner-level') ?? '';
    const pageResponse = await page.text();

    // If page is public we just return the page
    if (!pageLevel || pageLevel === 'public') {
      return {
        statusCode: 200,
        body: pageResponse,
      }
    }

    const cookies = getCookies(params);
    partnerToken = cookies['partner_token'] ?? '';

    // If page is not public and there is no partner_token cookie we redirect user to IMS login page
    if (!partnerToken) {
      return {
        statusCode: 301,
        body: '',
        headers: {
          Location: LOGIN_URL + `&state=${pageUrl}`,
        }
      }
    }

    // Decrypting parnter data and comparing page level and partner level
    const partnerDataResponse = await fetch(`https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/get-partner-data?partner_token=${partnerToken}&page_level=${pageLevel}`, {
      headers: {
        'X-OW-EXTRA-LOGGING': 'on',
      }
    });
    if (!partnerDataResponse.ok) {
      return {
        statusCode: 401,
        body: '<h1>No</h1>'
      }
    }

    return {
      statusCode: 200,
      body: pageResponse,
    }

  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
