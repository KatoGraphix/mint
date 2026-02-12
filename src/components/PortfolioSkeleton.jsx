import React from "react";
import Skeleton from "./Skeleton";

const PortfolioSkeleton = () => {
  return (
    <div className="min-h-screen pb-[env(safe-area-inset-bottom)] text-white relative overflow-x-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-full">
        <div 
          className="absolute inset-x-0 top-0"
          style={{ 
            height: '100vh',
            background: 'linear-gradient(180deg, #0d0d12 0%, #0e0a14 0.5%, #100b18 1%, #120c1c 1.5%, #150e22 2%, #181028 2.5%, #1c122f 3%, #201436 3.5%, #25173e 4%, #2a1a46 5%, #301d4f 6%, #362158 7%, #3d2561 8%, #44296b 9%, #4c2e75 10%, #54337f 11%, #5d3889 12%, #663e93 13%, #70449d 14%, #7a4aa7 15%, #8451b0 16%, #8e58b9 17%, #9860c1 18%, #a268c8 19%, #ac71ce 20%, #b57ad3 21%, #be84d8 22%, #c68edc 23%, #cd98e0 24%, #d4a2e3 25%, #daace6 26%, #dfb6e9 27%, #e4c0eb 28%, #e8c9ed 29%, #ecd2ef 30%, #efdaf1 31%, #f2e1f3 32%, #f4e7f5 33%, #f6ecf7 34%, #f8f0f9 35%, #f9f3fa 36%, #faf5fb 38%, #fbf7fc 40%, #fcf9fd 42%, #fdfafd 45%, #faf8fc 55%, #f8f6fa 100%)'
          }} 
        />
        <div className="absolute inset-x-0 top-[100vh] bottom-0" style={{ background: '#f8f6fa' }} />
      </div>

      <div className="relative px-5 pb-6 pt-10 md:px-8">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-4 md:max-w-md">
          <header className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-10 w-10 rounded-full bg-white/30" />
              <Skeleton className="h-5 w-28 mt-1 bg-white/30" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full bg-white/20" />
          </header>

          <section>
            <Skeleton className="h-10 w-48 bg-white/30" />
            <Skeleton className="h-4 w-24 mt-2 bg-white/20" />
          </section>

          <section className="flex gap-2 mt-1">
            <Skeleton className="h-10 w-24 rounded-full bg-white/20" />
            <Skeleton className="h-10 w-32 rounded-full bg-white/20" />
            <Skeleton className="h-10 w-24 rounded-full bg-white/20" />
          </section>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 px-4 md:max-w-md md:px-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-36 bg-slate-300/40" />
          <div className="flex gap-1">
            <Skeleton className="h-9 w-10 rounded-full bg-slate-300/30" />
            <Skeleton className="h-9 w-10 rounded-full bg-slate-300/30" />
            <Skeleton className="h-9 w-10 rounded-full bg-slate-300/30" />
            <Skeleton className="h-9 w-10 rounded-full bg-slate-300/30" />
          </div>
        </div>

        <div>
          <Skeleton className="h-8 w-44 bg-slate-300/40" />
          <Skeleton className="h-4 w-32 mt-2 bg-slate-300/30" />
        </div>

        <Skeleton className="h-[220px] w-full rounded-2xl bg-slate-200/50" />

        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-28 w-full rounded-3xl" />
      </div>
    </div>
  );
};

export default PortfolioSkeleton;
