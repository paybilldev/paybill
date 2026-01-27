import {FastifyError, FastifyRequest, FastifyReply} from 'fastify';

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // Map Fastify error codes to HTTP status codes
  const codeMap: Record<string, number> = {
    FST_ERR_NOT_FOUND: 404,
    FST_ERR_BAD_STATUS_CODE: 400,
    FST_ERR_VALIDATION: 400,
    FST_ERR_CTP_INVALID_TYPE: 400,
    FST_ERR_CTP_EMPTY_TYPE: 400,
    FST_ERR_CTP_INVALID_HANDLER: 400,
    FST_ERR_CTP_INVALID_PARSE_TYPE: 400,
    FST_ERR_CTP_INVALID_MEDIA_TYPE: 415,
    FST_ERR_CTP_INVALID_CONTENT_LENGTH: 400,
    FST_ERR_CTP_EMPTY_JSON_BODY: 400,
    FST_ERR_REP_INVALID_PAYLOAD_TYPE: 400,
    FST_ERR_CTP_BODY_TOO_LARGE: 413,
    FST_ERR_FAILED_ERROR_SERIALIZATION: 500,
    FST_ERR_SEND_UNDEFINED_ERR: 500,
    FST_ERR_REP_ALREADY_SENT: 500,
  };

  // Determine status code safely
  let statusCode: number;

  if (error.code && codeMap[error.code] !== undefined) {
    // Non-null assertion is safe because we checked above
    statusCode = codeMap[error.code]!;
  } else if (
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    statusCode = error.statusCode;
  } else {
    statusCode = 500;
  }

  // Customize message for specific errors
  let msg = error.message;
  if (error.code === 'FST_ERR_CTP_EMPTY_JSON_BODY') {
    msg = 'JSON Parse error: ' + error.message;
  }

  // Log internal server errors
  if (statusCode >= 500) {
    request.log.error(
      `APP Error: ${error.message}, Stack: ${error.stack}, Error name: ${
        error.name || 'undefined'
      }, Code: ${error.code || 'undefined'}`,
    );
    msg = `APP Error: ${error.message}, Stack: ${error.stack}, Error name: ${
      error.name || 'undefined'
    }, Code: ${error.code || 'undefined'}`; // generic message for client
    // msg = 'Internal Server Error'; // generic message for client
  }

  reply.code(statusCode).send({
    status: statusCode,
    msg,
  });
};
