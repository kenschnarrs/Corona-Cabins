import React from "react";
import Router from "next/router";
import { CabinProps } from "../lib/types";
import {Card, CardHeader, CardBody, CardFooter} from "@nextui-org/card";
import { Button, Image, Spacer } from "@nextui-org/react";
import NextImage from "next/image";

const CabinOption: React.FC<{ cabin: CabinProps }> = ({ cabin }) => {
  return (
    <Card
      isFooterBlurred
      radius="lg"
      isPressable
        onPress={() => Router.push("/p/[id]", `/p/${cabin.id}`)}
      className="border-none justify-between"
    >
      <CardHeader>
        <h2>
          {cabin.name}
        </h2>
      </CardHeader>
      <CardBody>
        <div className="image-container">
          <Spacer x={7} />
          <Image
            as={NextImage}
            alt="Woman listening to music"
            className="object-cover center-image" // Add center-image class
            height={200}
            src=""
            width={200}
          />
          <Spacer x={7} />
        </div>
        <Spacer y={4} />
        <p>
          {cabin.description}
        </p>
      </CardBody>
      <Spacer y={14} />
      <CardFooter className="justify-between before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-large bottom-1 w-[calc(100%_-_8px)] shadow-small ml-1 z-10">
        <h5>
          {cabin.price_per_night} pesos cada noche
        </h5>
      </CardFooter>
      <style jsx>{`
        .image-container {
          display: flex;
          justify-content: center; // Center horizontally
          align-items: center;
        }

        .center-image {
          width: 100%; // Ensure image fills the container
          height: auto; // Maintain aspect ratio
        }
      `}</style>

    </Card>

  );
};

export default CabinOption;