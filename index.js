const axios = require('axios');
const qs = require('qs');
const cors = require('cors');
const parser = require('xml2json');

const bucketName = 'samples';
const config1 = {
    endpoint: 's3.eu-gb.cloud-object-storage.appdomain.cloud',
    apiKeyId: 'GhC8.....azLO',
    serviceInstanceId: '8b....e4282b',
    signatureVersion: 'iam',
};


const express = require('express')
const app = express()
const port = 3000
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({extended: true})) // for parsing application/x-www-form-urlencoded
app.use(cors());
app.post('/transferSpec', mid);
app.post('/transferSpec/:mode', mid);

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

async function mid(req, res) {
    const token = (await getToken()).access_token;
    const faspConnectionInfoResponse = await getFASPConnectionInfo(token);
    const faspConnectionInfo = JSON.parse(faspConnectionInfoResponse).FASPConnectionInfo;
    const {delegated_refresh_token} = await getDelegatedRefreshToken();
    console.log(req.body)
    const transferSpec = await getAsperaTrasferSpec(
        faspConnectionInfo.ATSEndpoint,
        faspConnectionInfo.AccessKey.Id,
        faspConnectionInfo.AccessKey.Secret,
        delegated_refresh_token,
        req.body, req.params?.mode);
    console.log(transferSpec.transfer_specs[0].transfer_spec);
    res.json(transferSpec.transfer_specs[0].transfer_spec);
}

function getToken() {
    const data = qs.stringify({
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'apikey': config1.apiKeyId,
        'response_type': 'cloud_iam'
    });
    const config = {
        method: 'post',
        url: 'https://iam.cloud.ibm.com/identity/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        data
    };

    return axios(config)
        .then(response => response.data)
        .catch(function (error) {
            console.log(error);
        });
}

function getDelegatedRefreshToken() {
    const data = qs.stringify({
        'grant_type': 'urn:ibm:params:oauth:grant-type:apikey',
        'apikey': config1.apiKeyId,
        'response_type': 'delegated_refresh_token',
        'receiver_client_ids': 'aspera_ats'
    });
    const config = {
        method: 'post',
        url: 'https://iam.cloud.ibm.com/identity/token',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
        },
        data
    };

    return axios(config)
        .then(response => response.data)
        .catch(function (error) {
            console.log(error);
        });
}

function getFASPConnectionInfo(token) {
    const config = {
        method: 'get',
        url: `https://${config1.endpoint}/${bucketName}?faspConnectionInfo`,
        headers: {
            'Authorization': 'bearer ' + token,
            'ibm-service-instance-id': config1.serviceInstanceId,
        }
    };

    return axios(config)
        .then(response => {
            return parser.toJson(response.data)
        })
        .catch(function (error) {
            console.log(error.message);
        });
}

function getAsperaTrasferSpec(url, atsKey, atsSecret, delegatedRefreshToken, files, isUpload) {
    const config = {
        method: 'post',
        url: `${url}/files/${isUpload ? 'upload' : 'download'}_setup`,
        auth: {
            username: atsKey,
            password: atsSecret,
        },
        headers: {
            'X-Aspera-Storage-Credentials': JSON.stringify({
                "type": "token",
                "token": {"delegated_refresh_token": delegatedRefreshToken}
            }),
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        data: JSON.stringify({
            "transfer_requests": [{
                "transfer_request": {
                    "destination_root": `${isUpload ? '/' : ''}`,
                    "paths": files,
                    "tags": {
                        "aspera": {
                            "node": {
                                "storage_credentials": {
                                    "type": "token",
                                    "token": {"delegated_refresh_token": delegatedRefreshToken}
                                }
                            }
                        }
                    }
                }
            }]
        })
    };

    return axios(config)
        .then(response => response.data)
        .catch(function (error) {
            console.log(error);
        });
}
