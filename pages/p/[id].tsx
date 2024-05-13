import React from "react"
import { GetServerSideProps } from "next"
import ReactMarkdown from "react-markdown"
import Layout from "../../components/Layout"
import { CabinProps } from "../../lib/types"

import prisma from '../../lib/prisma';
import { PictureType } from "@prisma/client";
import Link from "next/link"

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
        <p>{props.cabin.description}</p>
      </div>
    </Layout>
  );
}

export default CabinShowPage
