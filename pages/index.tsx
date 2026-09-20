import React from "react";
import { GetStaticProps } from "next";
import Layout from "../components/Layout";
import Hero from "../components/Hero";
import CabinsSection from "../components/CabinsSection";
import ExperienceSection from "../components/ExperienceSection";
import Seo from "../components/Seo";
import { getCabins } from "../lib/cabins";
import type { CabinProps } from "../lib/types";

export const getStaticProps: GetStaticProps = async () => {
  const cabins = await getCabins();
  return { props: { cabins }, revalidate: 10 };
};

type HomePageProps = {
  cabins: CabinProps[];
};

// One-page landing matching Ken's approved mockup: hero, cabin cards fed
// from the live database, experience section, footer.
const HomePage: React.FC<HomePageProps> = ({ cabins }) => {
  return (
    <Layout header="none">
      <Seo path="/" />
      <main>
        <Hero />
        <CabinsSection cabins={cabins} />
        <ExperienceSection />
      </main>
    </Layout>
  );
};

export default HomePage;
