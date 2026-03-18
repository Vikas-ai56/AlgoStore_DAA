
## FastAPI
- Explored common function types and decorators, and saw how flexible FastAPI is for implementing concepts in different ways.
- Looked into CORS Middleware and its limitations.
- Reference: [FastAPI Docs](https://fastapi.tiangolo.com/tutorial/)

## Docker
This is my first time using docker
### Installation
- Installing Docker on Windows was a hassle (even caused a boot crash), so I switched to Ubuntu.
- Had to install GPG2 and set up passkeys since Ubuntu doesn’t include a password manager by default.
- Followed the official Docker and Digital Ocean guides:
    - [Docker for Linux](https://docs.docker.com/desktop/setup/install/linux/)
    - [Digital Ocean Docker install guide](https://www.digitalocean.com/community/tutorials/how-to-install-and-use-docker-on-ubuntu-22-04)

### Testing
- Faced issues with Docker accessing my local file system. Fixed it by adding this to my bash script:

```bash
    docker-fix() {
    export LOCAL_USER_ID=$(id -u)      # YOUR UID 
    export LOCAL_GROUP_ID=$(id -g)     # YOUR GID
    export DOCKER_FIX_USER_ID=$LOCAL_USER_ID
    export DOCKER_FIX_GROUP_ID=$LOCAL_GROUP_ID
    
    unalias docker-run docker-dev docker-safe 2>/dev/null || true
    alias docker-run="docker run --user \$LOCAL_USER_ID:\$LOCAL_GROUP_ID -e LOCAL_USER_ID=\$LOCAL_USER_ID -e LOCAL_GROUP_ID=\$LOCAL_GROUP_ID"
    alias docker-dev="docker-run -it --rm -v \$(pwd):/workspace -w /workspace"
    
    }

    docker-fix
```
    - Everything worked well after adding this into my bash script (You can either make a new script or add it into your source `~/.bashrc` file)

- Succesfully pulled and ran a postgres database which will be used in my project.

### Postgres config 
- Config file from official docker repo for [python](https://github.com/estebanx64/python-docker-dev-example/blob/main/config.py) with SQL-Alchemy
