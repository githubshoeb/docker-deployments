Local strapi Evironment Setup Steps For Docker
======================================================

1. Prerequisites 
---------------------------------------
1) Postgres databse should be up and running.


Note: To run postgres go to postgres folder and follow the instructions

2. pull the latest code
---------------------------------------
Before running the docker compose pull the latest code into strapi folder.

1) clone strapi code

    git clone  -b dev "strapi repo url"


3. Installing strapi Locally:
----------------------------------------------
Go into the linux directory and Open command prompt or terminal at strapi folder
```
docker compose build --no-cache 
docker compose up -d
docker compose ps
```