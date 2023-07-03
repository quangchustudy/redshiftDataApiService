# Demo

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