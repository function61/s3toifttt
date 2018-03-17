import {processEvent, HandlerConfig} from './index'

const sampleEvent: any = {
    "Records": [
        {
            "eventVersion": "2.0",
            "eventSource": "aws:s3",
            "awsRegion": "us-east-1",
            "eventTime": "2018-03-16T18:13:03.495Z",
            "eventName": "ObjectCreated:Put",
            "userIdentity": {
                "principalId": "A3VZ7OYFPYYDB3"
            },
            "requestParameters": {
                "sourceIPAddress": "1.2.3.4"
            },
            "responseElements": {
                "x-amz-request-id": "46BA6AEB9337AFAB",
                "x-amz-id-2": "xtGuQCj2Gdw1PH3MV10vFwqpkqT5h2qLYT/KLDfW1cMadFpw1DXqfb5OQebq+09d3WavQP78j1E="
            },
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "KeepassFileCreated",
                "bucket": {
                    "name": "my-bucket",
                    "ownerIdentity": {
                        "principalId": "A3VZ7OYFPYYDB3"
                    },
                    "arn": "arn:aws:s3:::my-bucket"
                },
                "object": {
                    "key": "databases/latest.kdbx",
                    "size": 0,
                    "eTag": "d41d8cd98f00b204e9800998ecf8427e",
                    "sequencer": "005AAC092F75F3DE90"
                }
            }
        }
    ]
};

function assertEqual(actual: string | number, expected: string | number) {
	if (actual !== expected) {
		throw new Error(`assertEqual failed: actual ${actual}; expected ${expected}`);
	}
}

const dummyConfig: HandlerConfig = {
	iftttToken: 'dummy-ifttt-token',
};

const res = processEvent(sampleEvent, dummyConfig);

assertEqual(res.HttpRequestsToMake.length, 1);
assertEqual(res.HttpRequestsToMake[0].Method, 'POST');
assertEqual(res.HttpRequestsToMake[0].URL, 'https://maker.ifttt.com/trigger/KeepassFileCreated/with/key/dummy-ifttt-token');
assertEqual(res.HttpRequestsToMake[0].ContentType, 'application/json');
assertEqual(res.HttpRequestsToMake[0].Body, '{"value1":"https://s3.amazonaws.com/my-bucket/databases/latest.kdbx","value2":"latest.kdbx"}');
