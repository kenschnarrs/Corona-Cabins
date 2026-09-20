/** @type {import('next').NextConfig} */

const nextConfig = {
    images: {
        remotePatterns: [{ hostname: "*.public.blob.vercel-storage.com" }],
    },
    async redirects() {
        return [
            {
                // The cabin cards moved onto the one-page home in Phase 1.
                source: "/select",
                destination: "/#cabins",
                permanent: false,
            },
        ];
    },
}

module.exports = nextConfig
