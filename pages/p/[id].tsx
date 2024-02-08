import React from "react"
import { GetServerSideProps } from "next"
import ReactMarkdown from "react-markdown"
import Layout from "../../components/Layout"
import { CabinProps } from "../../lib/types"
import Cabin from "../../components/Cabin"

import prisma from '../../lib/prisma';
import { PictureType } from "@prisma/client";

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const cabins = prisma.cabin.findUnique({
    where: {
      id: String(params?.id),
    },
    include: {
      images: {}
    }
  })
  return { 
    props: { cabins }, 
  }
}

const Post: React.FC<CabinProps> = (cabin) => {

  return (
    <Layout>
      <div>
        <h2>{cabin.name}</h2>
        <small>{cabin.price_per_night} pesos por noche</small>
        <ReactMarkdown children={cabin.description} />
      </div>
      <style jsx>{`
        .page {
          background: white;
          padding: 2rem;
        }

        .actions {
          margin-top: 2rem;
        }

        button {
          background: #ececec;
          border: 0;
          border-radius: 0.125rem;
          padding: 1rem 2rem;
        }

        button + button {
          margin-left: 1rem;
        }
      `}</style>
    </Layout>
  )
}

export default Post
