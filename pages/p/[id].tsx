import React from "react"
import { GetServerSideProps } from "next"
import ReactMarkdown from "react-markdown"
import Layout from "../../components/Layout"
import { CabinProps } from "../../lib/types"

import prisma from '../../lib/prisma';
import { PictureType } from "@prisma/client";

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const cabin = await prisma.cabin.findUnique({
    where: {
      id: String(params?.id),
    },
    include: {
      images: {}
    }
  })

  const serializedCabin = JSON.parse(JSON.stringify(cabin));

  return { 
    props: { cabin: serializedCabin }, 
  }
}

type CabinShowPageProps = {
  cabin: CabinProps;
}

const CabinShowPage: React.FC<CabinShowPageProps> = (props) => {

  return (
    <Layout>
      <div>
        <h2>{props.cabin.name}</h2>
        <small>{props.cabin.price_per_night} pesos por noche</small>
        <ReactMarkdown children={props.cabin.description} />
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

export default CabinShowPage
