
import React from "react"
import Layout from "../components/Layout"

import Router from "next/router";

import {Button} from '@nextui-org/react'

// home page, has some pictures and allows the viewing of the cabins
const IndexPage: React.FC = () => {
  return (
    <Layout>
      <div className="page">
        <h1>Welcome</h1>
        <main>
          <Button onClick={() => Router.push("/select")}>View Cabins</Button>
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

export default IndexPage
