# Demo

### Reference link
[Redshift Serverless Data API](https://github.com/aws-samples/getting-started-with-amazon-redshift-data-api/tree/main/quick-start/javascript)

### Use case:
Convert Redshift Serverless Data API to docker to break the limit of Lambda with the requirements for 200k ccu.

### Deployment:
CI/CD: Github -> Codebuild (buildspec) with ECR -> Deploy to ECS with NLB


### Client test:
We need to simulate 60k ccu to ECS.
***Solution stack***:
- k6 load test with --vus 2000 --iterations 2000
- 30 EC2 with crontab and setup the schedule to send at the same time. 
```bash
#!/bin/bash

mkdir -p ~/k6

cd ~/k6

sudo dnf install https://dl.k6.io/rpm/repo.rpm -y

sudo dnf install k6 -y

sudo yum install cronie -y

sudo systemctl enable crond.service

sudo systemctl start crond.service

#write out current crontab

crontab -l > mycron

#echo new cron into cron file

name="$(hostname)"

echo "35 14 1 * * ~/k6/script.sh >> ~/k6/$name.log 2>&1

37 14 1 * * aws s3 cp ~/k6/*.log s3://poc2-result/log/" >> mycron

#install new cron file

crontab mycron

rm -f mycron

echo '#!/bin/bash

date

date +%s

k6 run --vus 2000 --duration 5s --iterations 2000 ~/k6/k6.js

date

date +%s' >> script.sh

chmod 777 script.sh

echo 'import { sleep } from "k6"

import http from "k6/http"

const url = "<api url>";

export default function () {

  let data = {"queryIds":[$body]}

  let res = http.post(url, JSON.stringify(data));

}' >> k6.js
```

### Docker:

Build image: `sudo docker build -t test-aws .`

Run: `sudo docker run --name test-aws -dp 3000:3000 test-aws`

Log: `sudo docker logs -f test-aws`

### Docker Compose:

Start: `sudo docker compose up -d`

Shutdown: `sudo docker compose down`

Log: `sudo docker logs -f test-aws`

### Manual run:

Run: `mpn run start`