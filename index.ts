import * as https from 'https';
import * as url from 'url';
import * as path from 'path';

const versionMagic = '2.0';
const sourceMagic = 'aws:s3';
const s3SchemaVersionMagic = '1.0';

export interface HandlerConfig {
	iftttToken: string;
}

interface S3ObjectRecord {
	key: string;
}

interface S3Bucket {
	name: string;
}

interface S3Record {
	s3SchemaVersion: string;
	configurationId: string; // name you configured in S3 events
	bucket: S3Bucket;
	object: S3ObjectRecord;
}

interface RecordItem {
	eventVersion: string;
	eventSource: string;
	s3: S3Record;
}

interface RecordRoot {
	Records: RecordItem[];
}

function bucketFileUrl(bucketName: string, fileKey: string): string {
	return `https://s3.amazonaws.com/${bucketName}/${fileKey}`;
}

interface LambdaCallback { (err: Error | null, response?: string): void }

interface IFTTTMakerReq {
	value1?: string;
	value2?: string;
	value3?: string;
}

interface HttpRequestToMake {
	Method: string;
	URL: string;
	ContentType: string;
	Body: string;
}

interface Result {
	HttpRequestsToMake: HttpRequestToMake[];
}

function makeOneHttpRequest(req: HttpRequestToMake): Promise<void> {
	return new Promise((resolve, reject) => {
		const urlParsed = url.parse(req.URL);

		const outgoingReq = https.request({
			host: urlParsed.hostname,
			port: urlParsed.port,
			path: urlParsed.path,
			method: req.Method,
			headers: {
				'Content-Type': req.ContentType,
			}
		}, (res) => {
			res.on('end', () => {
				resolve();
			})
		});

		outgoingReq.on('error', (err) => {
			reject(err);
		});

		outgoingReq.end(req.Body);
	});
}

function makeAllHttpRequests(reqs: HttpRequestToMake[]): Promise<void[]> {
	return Promise.all<void>(reqs.map((req) => makeOneHttpRequest(req)));
}

function iftttMaker(event: string, iftttToken: string, req: IFTTTMakerReq): HttpRequestToMake {
	return {
		Method: 'POST',
		URL: `https://maker.ifttt.com/trigger/${event}/with/key/${iftttToken}`,
		ContentType: 'application/json',
		Body: JSON.stringify(req),
	};
}

function envOrDie(key: string): string {
	const val = process.env[key];

	if (val) {
		return val;
	}

	throw new Error(`Key ${key} not in ENV`);
}

export function processEvent(event: RecordRoot, config: HandlerConfig): Result {
	const outgoingReqs: HttpRequestToMake[] = [];

	for (const record of event.Records) {
		if (record.eventVersion !== versionMagic) {
			throw new Error(`Unexpected versionMagic, got ${record.eventVersion}; expecting ${versionMagic}`);
		}

		if (record.eventSource !== sourceMagic) {
			throw new Error(`Unexpected sourceMagic, got ${record.eventSource}; expecting ${sourceMagic}`);
		}

		if (record.s3.s3SchemaVersion !== s3SchemaVersionMagic) {
			throw new Error(`Unexpected s3SchemaVersionMagic, got ${record.s3.s3SchemaVersion}; expecting ${s3SchemaVersionMagic}`);
		}


		const fileUrl = bucketFileUrl(record.s3.bucket.name, record.s3.object.key);

		// 'databases/latest.kdbx' => 'latest.kdbx'
		const filename = path.posix.basename(record.s3.object.key);

		outgoingReqs.push(iftttMaker(record.s3.configurationId, config.iftttToken, {
			value1: fileUrl,
			value2: filename,
		}));
	}

	return {
		HttpRequestsToMake: outgoingReqs,
	};
}

export function handler(event: RecordRoot, context: undefined, callback: LambdaCallback) {
	const handerConfig: HandlerConfig = {
		iftttToken: envOrDie('IFTTT_TOKEN'),
	};

	try {
		const res = processEvent(event, handerConfig);

		makeAllHttpRequests(res.HttpRequestsToMake).then(() => {
			callback(null, 'OK');
		}, (err) => {
			callback(err);
		});
	} catch (err) {
		callback(err);
	}
}
