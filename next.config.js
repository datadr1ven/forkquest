/** @type {import('next').NextConfig} */
const nextConfig = {
    // Optional: if you get pg native errors
    webpack: (config) => {
        config.externals.push('pg', 'pg-query-stream');
        return config;
    },
};

module.exports = nextConfig;