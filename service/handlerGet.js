const { REDSHIFT_WORKGROUP, REDSHIFT_DATABASE, REDSHIFT_SECRET } = require("@dir/config")
const { toAsync } = require("@dir/utils")


const AWS = require('aws-sdk');

const handleGet = async (event) => {
    // input parameters passed from the caller event
	  // Amazon Redshift Serverless Workgroupname
	const redshiftWorkgroupName = "vnm-poc-dp-techx--wg"
    // database name for the Amazon Redshift cluster
  const redshiftDatabaseName = "vnmdataplatform"
  const redshiftSecret = "arn:aws:secretsmanager:ap-southeast-1:783163248618:secret:poc/vnm-poc-dp-redshift-serverless-Az0677"
    // run_type can be either asynchronous or synchronous; try tweaking based on your requirement
  const runType = "synchronous"

  let responses = new Array();
  let queryIds = new Array();

  if (runType !== 'synchronous' && runType !== 'asynchronous') {
    throw new Error('Invalid Event run_type. \n run_type has to be synchronous or asynchronous.');
  }

  const isSynchronous = (runType === 'synchronous');

  // returns a Map(), ES6+ preserves insertion ordering
  const sqlStatements = await populateSqlStatementSet();

  //console.log(`Running sql queries in ${runType} mode. \n`);

  // Initiate RedshiftData client
  //const redshiftDataApiClient = new RedshiftData({ region: 'ap-southeast-1' });
  const redshiftDataApiClient = new AWS.RedshiftData({ region: 'ap-southeast-1' });
  const queries = Array.from(sqlStatements.values());

  // If using Lambda layers, uncomment the line below
  // const redshiftDataApiClient = new RedshiftData({ region: "us-east-1" });
  const res = await Promise.all(queries.map(async (query) => {
        const queryResults = await executeSqlDataApi(redshiftDataApiClient, redshiftWorkgroupName, redshiftDatabaseName, redshiftSecret, "SELECT", query, isSynchronous);
        responses = [...responses, queryResults.queryStatus]
        queryIds = [...queryIds, queryResults.queryId]
      }))


//   for (const [command, query] of sqlStatements.entries()) {
//     console.log(`Example of ${command} mode.`);
//     const res = await executeSqlDataApi(redshiftDataApiClient, redshiftWorkgroupName, redshiftDatabaseName, redshiftSecret, command, query, isSynchronous);
//     responses.set(`${command} STATUS: `, res.queryStatus);
//     queryIds = [...queryIds, res.queryId];
//   };

  return {
    statusCode: 200,
    body: {
      "results" :[...responses.entries()], //JSON.stringify([...responses.entries()]),
      "queryIds": queryIds //JSON.stringify(queryIds)
  }};
};

const executeSqlDataApi = async (redshiftDataApiClient, redshiftWorkgroupName, redshiftDatabaseName, redshiftSecret, command, query, isSynchronous) => {
  let queryId = '';

  const executeStatementInput = {
    WorkgroupName: redshiftWorkgroupName,
    Database: redshiftDatabaseName,
    Sql: query,
    SecretArn: redshiftSecret
  };

  // Calling Redshift Data API with executeStatement()
  await redshiftDataApiClient.executeStatement(executeStatementInput).promise()
    .then((response) => {
      queryId = response.Id;
    })
    .catch((error) => {
      console.log('ExecuteStatement has failed.');
      throw new Error(error);
    });

  let { Status: queryStatus } = await getDescribeStatement(redshiftDataApiClient, queryId);

  //console.log(`Executed command: ${command} | Query Status: ${queryStatus} | QueryId: ${queryId}`);

  if (isSynchronous) {
    queryStatus = await executeSynchronousWait(redshiftDataApiClient, queryStatus, queryId, command);
  }

  return {queryId: queryId, queryStatus: queryStatus};
};

const executeSynchronousWait = async (redshiftDataApiClient, queryStatus, queryId, command) => {
  let attempts = 0;
  const MAX_WAIT_CYCLES = 100;
  let describeStatementInfo = {};

  // Wait until query is finished or max cycles limit has been reached.
  while (attempts < MAX_WAIT_CYCLES) {
    attempts++;
    //await sleep(1);

    ({ Status: queryStatus, ...describeStatementInfo } = await getDescribeStatement(redshiftDataApiClient, queryId));

    if (queryStatus === 'FAILED') {
      throw new Error(`SQL query failed: ${queryId}: \n Error: ${describeStatementInfo.Error}`);
    } else if (queryStatus === 'FINISHED') {
      //console.log(`Query status is: ${queryStatus} for query id: ${queryId} and command: ${command}`);

      // Print query response if available (typically from Select SQL statements)
      if (describeStatementInfo.HasResultSet) {
        await redshiftDataApiClient.getStatementResult({ Id: queryId }).promise()
          .then((statementResult) => {
            console.log(`Printing response for query: ${command} --> ${JSON.stringify(statementResult.Records)}`);
          })
          .catch((error) => {
            console.log('GetStatementResult has failed.');
            throw new Error(error);
          });
      }

      break;
    } else {
      console.log(`Currently working... query status is ${queryStatus}`);
    }

    if (attempts >= MAX_WAIT_CYCLES) {
      throw new Error(`Limit for MAX_WAIT_CYCLES has been reached before the query was able to finish. We have exited out of the while-loop. You may increase the limit accordingly. \n Query status is: %s for query id: ${queryId} and command: ${command}`);
    }
  }
  return queryStatus;
};

const getDescribeStatement = async (redshiftDataApiClient, queryId) => redshiftDataApiClient
  .describeStatement({ Id: queryId })
  .promise()
  .then(response => {
    return response;
  })
  .catch((error) => {
    console.log('DescribeStatement has failed.');
    throw new Error(error);
  });

const populateSqlStatementSet = async () => {
  const sqlStatements = new Map();
  sqlStatements.set('SELECT1','SELECT region_code, distributor_code, distributor_name,SUM(total_amount),sum(total_lw_product_amount),SUM(total_lw_product_amount)/SUM(SUM(total_lw_product_amount)) OVER()FROM vnm_poc.agg_sales las GROUP BY 1,2,3 LIMIT 10000;');
  sqlStatements.set('SELECT2', 'SELECT region_code, distributor_code, distributor_name, outlet_code, outlet_name,SUM(total_amount),sum(total_lw_product_amount),SUM(total_lw_product_amount)/SUM(SUM(total_lw_product_amount)) OVER() FROM vnm_poc.agg_sales las GROUP BY 1,2,3,4,5 LIMIT 10000;');
  sqlStatements.set('SELECT3', 'SELECT region_code, distributor_code, distributor_name, outlet_code, outlet_name,SUM(total_origin_slot),SUM(total_not_activate_slot),SUM(total_used_slot) FROM vnm_poc.agg_slot las GROUP BY 1,2,3,4,5 LIMIT 10000;');
  sqlStatements.set('SELECT4', 'SELECT region_code, distributor_code, distributor_name, outlet_code, outlet_name, prize,SUM(total_reward_product_quantity) FROM vnm_poc.agg_reward lar GROUP BY 1,2,3,4,5,6 ORDER BY SUM(total_reward_product_quantity) DESC LIMIT 10000;');
  sqlStatements.set('SELECT5', 'SELECT DATE(date), SUM(SUM(daily_total_sales)) OVER(ORDER BY date rows unbounded preceding) as sum_total, SUM(SUM(daily_expected_sales)) OVER(ORDER BY date rows unbounded preceding) as sum_expected FROM vnm_poc.agg_daily_region_sales GROUP BY date');
  sqlStatements.set('SELECT6', 'SELECT DATE(date), SUM(SUM(daily_total_origin_slot)) OVER(ORDER BY date rows unbounded preceding), SUM(SUM(daily_expected_slot)) OVER(ORDER BY date rows unbounded preceding) FROM vnm_poc.agg_daily_region_slot ladrs GROUP BY date');
  sqlStatements.set('SELECT7', 'SELECT (SUM(CASE WHEN date >= convert_timezone(\'Asia/Ho_Chi_Minh\', getdate()) THEN 0 ELSE daily_total_sales END) / SUM(daily_expected_sales)) AS result FROM vnm_poc.agg_daily_region_sales ladrs;');
  sqlStatements.set('SELECT8', 'SELECT (SUM(CASE WHEN date >= convert_timezone(\'Asia/Ho_Chi_Minh\', getdate()) THEN 0 ELSE daily_total_origin_slot END) / SUM(daily_expected_slot)) AS result FROM vnm_poc.agg_daily_region_slot ladrs;');
  sqlStatements.set('SELECT9', 'SELECT (SUM(CASE WHEN date >= convert_timezone(\'Asia/Ho_Chi_Minh\', getdate()) THEN 0 ELSE daily_total_cost END) / SUM(daily_expected_cost)) AS result FROM vnm_poc.agg_daily_region_cost ladrc;')
  sqlStatements.set('SELECT10', 'SELECT (SUM(CASE WHEN date >= convert_timezone(\'Asia/Ho_Chi_Minh\', getdate()) THEN 0 ELSE total_reward_product_quantity END) / SUM(total_expected_prize_quantity)) AS result FROM vnm_poc.agg_daily_region_reward ladrr;')
  

  return sqlStatements;
};

const sleep = (seconds) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};

module.exports = { handleGet }