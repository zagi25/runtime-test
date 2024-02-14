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
  const SCOPES='openid,AdobeID';
  const LOGIN_URL = `https://ims-na1.adobelogin.com/ims/authorize/v2?redirect_uri=https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/edge-worker&client_id=${CLIENT_ID_PROD}&scope=${SCOPES}`;

  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action');
    const cookies = getCookies(params);
    let partnerToken = cookies['partnerToken']

    if (!partnerToken && !params.code) {
      return {
        statusCode: 301,
        body: '',
        headers: {
          Location: LOGIN_URL,
        }
      }
    }

    if (params.code && !partnerToken) {
      const { partnerData } = await (await fetch(`https://14257-ratkotest-dev.adobeioruntime.net/api/v1/web/RatkoDev/get-partner-data?code=${params.code}`)).json();
      partnerToken = partnerData;

      if (!partnerToken) {
        return {
          statusCode: 401,
          body: '<h1>No</h1>'
        }
      }
    }
    const page = await (await fetch('https://main--milo--adobecom.hlx.page/drafts/ratko/icon-block')).text();

    const headers = {};
    if (partnerToken) {
      headers['Set-Cookie'] = `partnerToken=${partnerToken}`;
    }

    return {
      statusCode: 200,
      body: page,
      headers
    }

  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
