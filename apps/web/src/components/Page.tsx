import type {ReactNode} from 'react';

export function Page({eyebrow,title,description,action,children}:{eyebrow:string;title:string;description?:string;action?:ReactNode;children:ReactNode}){
 return <><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">{eyebrow}</div><h1 className="mt-2 text-4xl font-bold tracking-tight">{title}</h1>{description&&<p className="mt-2 max-w-2xl text-black/55">{description}</p>}</div>{action}</header>{children}</>;
}
