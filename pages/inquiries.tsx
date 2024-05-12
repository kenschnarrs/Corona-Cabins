
import React from 'react';

import Layout from "../components/Layout"
import Router from "next/router";

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