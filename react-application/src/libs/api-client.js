import queryString from 'query-string';

class ApiResponseError extends Error {
  constructor(status) {
    super('Error response received');
    this.status = status;
  }
}

function appendQuery(url, query = {}) {
  if (Object.keys(query).length === 0) {
    return url
  }

  return `${url}?${queryString.stringify(query)}`;
}

async function sendRequest(endpoint, headers={}, opts = {}, query = {}) {
  const url = appendQuery(endpoint, query);

  const defaultHeaders = {
    'Content-type': 'application/json; charset=utf-8',
    Accept: 'application/json'
  };

  const requestHeaders = {
    ...defaultHeaders,
    ...headers
  };

  const response = await fetch(url, { ...opts, headers: requestHeaders });

  if (!response.ok) {
    throw new ApiResponseError(response.status);
  }

  const contentType = response.headers.get('content-type');

  if (contentType === undefined) {
    return;
  }

  let responseBody = undefined;

  if (contentType.includes('application/json')) {
    responseBody = response.json();
  }

  return responseBody;
}

async function postRequest(endpoint, headers={}, body = {}, query = {}) {
  let opts = {
    method: 'POST',
    body: JSON.stringify(body)
  }

  return sendRequest(endpoint, headers, opts, query);
}

class EmailPaymentResource {
  constructor(config) {
    this._config = config;
  }

  async create(senderEmail, recipientEmail, encryptedPrivateKey, userPublicKey, currency, amount, expirationDate) {
    return postRequest(
      `${this._config.baseUrl}/v1/payments/email`,
      {},
      {
        senderEmail,
        recipientEmail,
        userPublicKey: userPublicKey.toString(),
        encryptedPrivateKey,
        currency,
        amount,
        expirationDate
      }
    );
  }
}

class PaymailPaymentResource {
  constructor(config) {
    this._config = config;
  }

  async create(handle, currency, amount) {
    return postRequest(
      `${this._config.baseUrl}/v1/payments/paymail`,
      {},
      {
        handle,
        currency,
        amount
      }
    );
  }
}

class PaymentsResource {
  constructor (config) {
    this._config = config;
    this.email = new EmailPaymentResource(config);
    this.paymail = new PaymailPaymentResource(config);
  }

  async get(uuid) {
    return sendRequest(
      `${this._config.baseUrl}/v1/payments/${uuid}`
    );
  }

  async confirm(uuid, rawTx) {
    return postRequest(
      `${this._config.baseUrl}/v1/payments/${uuid}/confirm`,
      {},
      { rawTx }
    );
  }
}

class UtxosResource {
  constructor(config) {
    this._config = config;
  }

  async spend(uuid, type, to) {
    return postRequest(
      `${this._config.baseUrl}/v1/utxos/${uuid}/spend`,
      {},
      { type, to }
    );
  }
}

class ApiClient {
  constructor (config) {
    this.payments = new PaymentsResource(config);
    this.utxos = new UtxosResource(config);
  }
}

export default ApiClient;

export { ApiResponseError };
