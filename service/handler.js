const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = require("@dir/config")
const { toAsync } = require("@dir/utils")
const AWS = require('aws-sdk')
AWS.config.update({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  }
})
const RedshiftDataApiClient = new AWS.RedshiftData({ region: 'ap-southeast-1' })


const handle = async (body = {}) => {
  const { queryIds = [] } = body

  const responses = await Promise.all(queryIds.map(async (queryId) => {
    return await toAsync(RedshiftDataApiClient.getStatementResult({ Id: queryId }).promise())
  }))

  for (const res of responses) {
    if (res.err) return { success: false, message: "Fail", error: res.err }
  }

  return { success: true, message: "Success", data: responses.map(e => e.data) }
}

module.exports = { handle }