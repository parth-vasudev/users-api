# Users API

## Installation
```bash
npm install
```

## Usage
Make sure to have mongo running locally
```bash
monogd
```
Start the service
```bash
npm start
```
Use
```bash
POST /users

Request Body:
{
	"name": "NAME",
	"fullName": {
		"firstName": "NAME"
	},
	"age": "AGE",
	"birthDate": "DATE"
}

GET /users/id

PUT /users/id
{
	"name": "NEW_NAME",
	"fullName": {
		"firstName": "NEW_NAME"
	},
	"age": "NEW_AGE",
	"birthDate": "NEW_DATE"
}

GET /users

DELETE /users/id
```
