docker exec -it postgres-algostore-daa psql -U <user_name> -d postgres-algostore-daa

<!-- In the psql tab run the below commands -->

CREATE USER vikas WITH PASSWORD 'your_password';
ALTER USER vikas WITH SUPERUSER;

CREATE DATABASE "postgres-algostore-daa"; <!--database name is your wish but make sure not to OVERWRITE -->