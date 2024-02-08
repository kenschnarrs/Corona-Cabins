import React from "react"
import { GetStaticProps } from "next"
import Layout from "../components/Layout"
import CabinOption from "../components/CabinOption"
import {CabinProps} from "../lib/types";

import prisma from '../lib/prisma';
import { PictureType } from "@prisma/client";

export const getStaticProps: GetStaticProps = async () => {
  const cabins = await prisma.cabin.findMany({
    include: {
      images: {
        where: {
          type: PictureType.Primary
        }
      }
    }
  })

  const serializedCabins = JSON.parse(JSON.stringify(cabins));

  return { 
    props: { cabins: serializedCabins }, 
    revalidate: 10 
  }
}

type SelectPageProps = {
  cabins: CabinProps[]
}

const SelectPage: React.FC<SelectPageProps> = (props) => {
  return (
    <Layout>
      <div className="page">
        <h1>Cabins</h1>
        <main>
          {props.cabins.map((cabin) => (
            <div key={cabin.id} className="post">
              <CabinOption cabin={cabin} />
            </div>
          ))}
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

export default SelectPage
