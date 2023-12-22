# forum-app Readme

This repository contains a simple forum application built with Node.js, Express, and MySQL. Follow the steps below to set up and run the application.

## Prerequisites

Before you begin, make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [MySQL](https://www.mysql.com/)

## Installation

1. Clone this repository to your local machine:

    ```bash
    git clone <https://github.com/moshahid23/forum-app>
    ```

2. Navigate to the project directory:

    ```bash
    cd forum-app
    ```

3. Install the project dependencies using npm:

    ```bash
    npm install
    ```

    This will install the required dependencies listed in the `package.json` file.

## Database Setup

1. Execute the `create_db.sql` script to create the necessary database and tables:

    ```bash
    mysql -u your_username -p < create_db.sql
    ```

    Enter your MySQL password when prompted.

2. Insert test data into the database using the `insert_test_data.sql` script:

    ```bash
    mysql -u your_username -p < insert_test_data.sql
    ```

    Enter your MySQL password when prompted.

## Run the Application

1. Start the application by running the following command:

    ```bash
    node index.js
    ```

    Make sure you are still within the project's root folder.

2. Open your web browser and navigate to [http://localhost:8000](http://localhost:8000) to access the forum application.

The application is now up and running.