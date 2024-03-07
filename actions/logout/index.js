
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


const { Core } = require('@adobe/aio-sdk')
const { errorResponse } = require('../utils')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    return {
      statusCode: 200,
      body: '',
      headers: {
        'Set-Cookie': ['partner_token=; Path=/; HttpOnly; Secure; SameSite=None; Domain=.14257-ratkotest-dev.adobeioruntime.net; Max-Age=0', 'aux_sid=; Path=/; HttpOnly; Secure; SameSite=None; Domain=.14257-ratkotest-dev.adobeioruntime.net; Max-Age=0']
      }
    }
  } catch (error) {
    // log any server errors
    // return with 500
    return errorResponse(500, 'server error', logger)
  }
}

exports.main = main
