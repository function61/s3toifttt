S3toIFTTT
=========

A Lambda function that watches for new files in an S3 bucket, and on a new
file notifies IFTTT with the URL to that file.

In IFTTT you could, for example:

- Upload that file into your Google Drive folder.
- Or do something else that can accept an URL to a file.

Written with TypeScript.


TODO
----

- Sign S3 URLs, so the bucket access need not be public.
- Automatically release compiled .js of this project.


How to get this to work
-----------------------

- Compile
- Create a Recipe in IFTTT
- Create AWS Lambda function
- Configure your S3 bucket to send events to the Lambda function


How to compile
--------------

```
$ apt update && apt install -y nodejs npm
$ npm install -g typescript
$ npm install @types/node
$ tsc
$ nodejs tests.js # runs tests
```

Pro-tip: you can use Docker to compile the stuff so you don't have to install any tools on your host.


Create recipe in IFTTT
----------------------

You can do many things in IFTTT with this S3 adapter, since this posts Webhook events with details like this to IFTTT:

- Event name = the event you specified in S3. For example I had `KeepassFileCreated`
- Value1 = URL to the new file
- Value2 = filename of the file

As an example, I am going to describe how I used this to transfer files to my Google Drive
from S3 (specifically, I transfer [KeePass](https://keepass.info/) databases).

Instructions:

- Create new applet.
- For "this" (service) part, select `Webhooks` -> `Receive a web request`
- For event name, I configured `KeepassFileCreated` (take a note of this, you'll need it later)
- For "that" (trigger) part, select `Google Drive` -> `Upload file from URL`
- File URL -> `Value1`
- File name -> `Value2`
- Drive folder path -> `KeePass` (make sure the folder exists)
- Now save it

You'll need a token to call the webhook. Go [here](https://ifttt.com/maker_webhooks) and click on `Documentation`.

There'll be a text:

> Your key is: ____________

Take note of it, we'll configure it to AWS Lambda.


Configure AWS Lambda
--------------------

- Create new Lambda function.
- You can name it `S3toIFTTT`
- Runtime -> `Node.js 6.10`
- Execution role -> `lambda_basic_execution`
- Now copy-paste the code from compilation result of `index.js`
- Add ENV variable `IFTTT_TOKEN`. Enter the webhook token from IFTTT.


Configure S3 bucket
-------------------

If you don't already have a S3 bucket, create one. It'll have to have public access for now (see TODO).

For bucket policy, put:

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "*"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::my-bucket/*"
        }
    ]
}
```

Obviously, replace `my-bucket` with your bucket's name.

Configure a bucket event:

- Name = `KeepassFileCreated` (this is important, use the exact same name you configured in IFTTT)
- Events = `ObjectCreate (All)`
- Prefix filter = define this if you want to restrict IFTTT notifications to a certain folder..
- Send to = Lambda, choose `S3toIFTTT`.
- Save.

You should now be done. Try uploading a file in your bucket, and it should appear in your Google Drive.
