const { getCliEnv, DEFAULT_ENV } = require('@adobe/aio-lib-env')

const PARTNER_SERVICE_ENDPOINTS = {
  stage: 'https://partnerservices-stage-va6.stage.cloud.adobe.io',
  prod: 'https://partnerservices-va6.cloud.adobe.io',
}

async function _sendRequest(method, url, headers, data) {
  const requestOptions = {
    method, 
    headers,
  }

  if (method === 'POST') {
    let formData = data
    if (!(formData instanceof FormData)) {
      formData = Object.keys(data).reduce((formData, key) => {
        formData.append(key, data[key])
        return formData
      }, new FormData())
    }
    requestOptions.body = formData
  }

  const validateResponse = (res) => {
    if (res.ok) {
      return res
    }
    throw (new Error(`${res.status} (${res.statusText})`))
  }

  const handleTextResponse = (text) => {
    try {
      return JSON.parse(text)
    } catch (e) {
      return text
    }
  }

  return fetch(url, requestOptions)
    .then(validateResponse)
    .then((res) => res.text())
    .then(handleTextResponse);
}

async function _sendPost (postUrl, headers, postData) {
  return _sendRequest('POST', postUrl, headers, postData)
}

async function _sendGet (getUrl, headers) {
  return _sendRequest('GET', getUrl, headers)
}

class PartnerService {
  constructor (programType, env = getCliEnv()) {
    this.env = env;
    this.endpoint = PARTNER_SERVICE_ENDPOINTS[env] || PARTNER_SERVICE_ENDPOINTS[DEFAULT_ENV];
    this.programType = programType;
  }

  getApiUrl(api) {
    return this.endpoint + api;
  }

  async getPartnerData(email, token) {
    const headers = {
      'x-user-token': token,
      'Accept': 'application/json',
      'Authorization': 'Bearer ' + token,
    }

    return _sendGet(this.getApiUrl(`/apis/partner?email=${email}&programType=${this.programType}`), headers); 
  }
}


module.exports = {
  PartnerService
}
