import React from 'react';
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";

import Layout from "../components/Layout"
import { authOptions } from "./api/auth/[...nextauth]";
import { isAdminEmail } from "../lib/admin";

// Admin-only page: enforced on the server, not just hidden in the UI.
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session || !isAdminEmail(session.user?.email)) {
    return {
      redirect: { destination: "/api/auth/signin", permanent: false },
    };
  }
  return { props: {} };
};

const InquiriesPage: React.FC = () => {
    return (
        <Layout>
          <div className="page">
            <h1>Inquiries</h1>
            <main>
              
    
            </main>
          </div>
          <style jsx>{`
            .post {
              background: white;
              transition: box-shadow 0.1s ease-in;
            }
    
            .post:hover {
              box-shadow: 1px 1px 3px #aaa;
            }
    
            .post + .post {
              margin-top: 2rem;
            }
          `}</style>
        </Layout>
      )
}

export default InquiriesPage;
