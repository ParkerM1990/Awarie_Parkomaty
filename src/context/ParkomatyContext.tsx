import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "../services/supabase";

export interface Parkomat {
  id: string;
  structure: string;
  location: string;
  node: string;
  node_2?: string;
  lat?: number;
  lng?: number;
}

type ParkomatyContextType = {
  parkomaty: Parkomat[];
  loading: boolean;
  reload: () => Promise<void>;
};

const ParkomatyContext =
  createContext<
    ParkomatyContextType | undefined
  >(undefined);

export function ParkomatyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [parkomaty, setParkomaty] =
    useState<Parkomat[]>([]);

  const [loading, setLoading] =
    useState(true);

  async function reload() {
    setLoading(true);

    let allParkomaty: Parkomat[] = [];

    let from = 0;
    const limit = 1000;

    while (true) {
      const {
        data,
        error,
      } = await supabase
        .from("parkomaty")
        .select("*")
        .range(
          from,
          from + limit - 1
        );

      if (error) {
        console.error(error);
        break;
      }

      allParkomaty = [
        ...allParkomaty,
        ...(data || []),
      ];

      if (
        !data ||
        data.length < limit
      ) {
        break;
      }

      from += limit;
    }

    setParkomaty(allParkomaty);
    setLoading(false);
  }

  useEffect(() => {
    reload();

    const channel = supabase
      .channel("parkomaty-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parkomaty",
        },
        async () => {
          await reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  return (
    <ParkomatyContext.Provider
      value={{
        parkomaty,
        loading,
        reload,
      }}
    >
      {children}
    </ParkomatyContext.Provider>
  );
}

export function useParkomaty() {
  const context =
    useContext(ParkomatyContext);

  if (!context) {
    throw new Error(
      "useParkomaty musi być użyty wewnątrz ParkomatyProvider"
    );
  }

  return context;
}