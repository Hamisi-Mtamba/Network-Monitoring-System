import pg from 'pg';

const { Pool } = pg;


// create a PostgreSQL connection pool using environment variables for configuration

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

const connectDB = async () => {
    try {

        //Try to connect to the PostgreSQL database using the connection pool

        const client = await pool.connect();

        console.log('PostgreSQL database connected successfully');

        client.release();
    } catch (error) {
        console.error('Error connecting to PostgreSQL database:', error);
        process.exit(1);
    }
};

export { pool, connectDB };