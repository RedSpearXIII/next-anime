import Footer from "@/src/components/Footer";
import Meta from "@/src/components/Meta";
import AnimeInfoComp from "@/src/components/Watch/AnimeInfo";
import EpisodeInfo from "@/src/components/Watch/EpisodeInfo";
import EpisodeList from "@/src/components/Watch/EpisodeList";
import MoreLikeThis from "@/src/components/Watch/MoreLikeThis";
import SelectSource from "@/src/components/Watch/SelectSource";
import {
  default_provider,
  getAnimeEpisodeStreaming,
  getAnimeInfo,
} from "@/src/services/anime";
import { AnimeInfo } from "@/src/types/anime";
import { Episode } from "@/src/types/utils";
import { getAnimeTitle, getStreamAnimeWithProxy } from "@/src/utils/contants";
import { GetServerSideProps, GetServerSidePropsContext } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useQuery } from "react-query";
import SelectIframe from "@/src/components/Watch/SelectIframe";
import Note from "@/src/components/Watch/Note";
import CommentList from "@/src/components/Comment/CommentList";

interface WatchProps {
  info: AnimeInfo;
}

const Player = dynamic(() => import("../../components/Player"), {
  ssr: false,
});

const Watch: React.FC<WatchProps> = ({ info }) => {
  const [episode, setEpisode] = useState<Episode>(info?.episodes?.[0]);
  const [isWatchIframe, setIsWatchIframe] = useState(false);
  const router = useRouter();

  const { data, isError, isFetching } = useQuery(
    [`watch-${JSON.stringify(episode)}`],
    () => {
      if (!episode) return null;
      return getAnimeEpisodeStreaming(
        episode?.id,
        (router?.query?.provider as string) || "gogoanime"
      );
    }
  );

  const handleSelectEpisode = (episode: Episode) => {
    setEpisode(episode);
  };

  const handleNextEpisode = () => {
    const currentIndexEpisode = info?.episodes?.findIndex(
      (item) => item?.id === episode?.id
    );

    if (currentIndexEpisode < info?.episodes?.length - 1) {
      setEpisode(info?.episodes?.[currentIndexEpisode + 1]);
      return true;
    }

    return false;
  };

  useEffect(() => {
    setEpisode(info?.episodes?.[0]);
  }, [router?.query?.provider]);

  return (
    <div>
      <Meta
        title={`Next Anime - ${getAnimeTitle(info?.title)} - Watch`}
        image={info?.cover}
        description="Next Anime is a free anime watch website built using Consumet API"
      />
      <div className="lg:flex">
        <div className="pb-5 md:w-[calc(100%-500px)] w-full">
          <div className="bg-[#111] w-full lg:aspect-[16/9] z-[9999] aspect-video flex items-center justify-center">
            {!episode && (
              <h5 className="text-sm font-semibold">
                Please select the episode
              </h5>
            )}
            {isError && (
              <h5 className="text-sm font-semibold">
                Failed to data source episode
              </h5>
            )}
            {isFetching && (
              <h5 className="text-sm font-semibold">Loading episode data...</h5>
            )}
            {!isFetching && episode && data && (
              <div className="w-full h-full">
                {isWatchIframe ? (
                  <iframe
                    src={data?.headers?.Referer}
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <Player
                    source={data?.sources?.map((item) => ({
                      label: item?.quality,
                      url:
                        router?.query?.provider === "gogoanime"
                          ? item?.url
                          : getStreamAnimeWithProxy(item?.url),
                    }))}
                    className="w-full h-full"
                    poster={episode?.image as string}
                    color="#FF0000"
                    subtitle={data?.subtitles?.map((item) => ({
                      lang: item.lang,
                      url: `/api/subtitles?url=${encodeURIComponent(
                        item?.url
                      )}`,
                    }))}
                    handleNext={handleNextEpisode}
                    intro={data?.intro || null}
                  />
                )}
              </div>
            )}
          </div>
          <div className="md:flex w-full">
            <div className="w-full p-4 md:mt-0 mt-5">
              <SelectSource idAnime={info?.id} />
              {data?.headers?.Referer && (
                <SelectIframe
                  isWatchIframe={isWatchIframe}
                  setIsWatchIframe={setIsWatchIframe}
                />
              )}
              <EpisodeList
                animeId={info?.id}
                episodeId={episode?.id as string}
                episodes={info?.episodes}
                handleSelectEpisode={handleSelectEpisode}
              />
              <Note />
              {episode && <EpisodeInfo episode={episode} />}
              <AnimeInfoComp
                description={info?.description}
                duration={info?.duration}
                image={info?.image}
                releaseDate={info?.releaseDate}
                title={info?.title}
                type={info?.type}
                nextAiringEpisode={info?.nextAiringEpisode}
              />
              {/* <CommentList /> */}
            </div>
          </div>
        </div>

        <MoreLikeThis
          recommendations={info?.recommendations}
          relations={info?.relations}
        />
      </div>
      <Footer />
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  try {
    const id = context.params?.id as string;
    const provider = (context.query?.provider as string) || default_provider;

    if (!id) {
      return {
        notFound: true,
      };
    }

    const info = await getAnimeInfo(id, provider);

    return {
      props: {
        info,
      },
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
};

export default Watch;
