import React, { useState } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import Layout from "../../../components/Layout";
import Seo from "../../../components/Seo";
import RichTextEditor from "../../../components/RichTextEditor";
import { authOptions } from "../../api/auth/[...nextauth]";
import { isAdminEmail } from "../../../lib/admin";
import prisma from "../../../lib/prisma";
import type { CabinProps } from "../../../lib/types";

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  if (!session || !isAdminEmail(session.user?.email)) return { redirect: { destination: "/api/auth/signin", permanent: false } };
  const cabin = await prisma.cabin.findUnique({ where: { id: String(ctx.params?.id) }, include: { images: { orderBy: { sort_order: "asc" } } } });
  if (!cabin) return { notFound: true };
  return { props: { initialCabin: JSON.parse(JSON.stringify(cabin)) } };
};

export default function CabinAdmin({ initialCabin }: { initialCabin: CabinProps }) {
  const [cabin, setCabin] = useState(initialCabin), [es, setEs] = useState(cabin.description_es), [en, setEn] = useState(cabin.description_en);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const api = `/api/admin/cabins/${cabin.id}`;
  async function request(url: string, init?: RequestInit) { const r = await fetch(url, init); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Request failed"); return j; }
  async function refresh() { const all = await request("/api/admin/cabins"); setCabin(all.find((c: CabinProps) => c.id === cabin.id)); }
  async function saveDescriptions() { setBusy(true); setMessage(""); try { await request(api, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description_es: es, description_en: en }) }); setMessage("Descriptions saved."); } catch(e) { setMessage(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); } }
  async function upload(file?: File) { if (!file) return; setBusy(true); setMessage(""); try { const dataUrl = await new Promise<string>((ok, fail) => { const r = new FileReader(); r.onload=()=>ok(String(r.result)); r.onerror=()=>fail(r.error); r.readAsDataURL(file); }); await request(`${api}/images`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type, dataUrl }) }); await refresh(); setMessage("Photo uploaded."); } catch(e) { setMessage(e instanceof Error ? e.message : "Upload failed."); } finally { setBusy(false); } }
  async function action(path: string, method: string, body: object) { setBusy(true); setMessage(""); try { await request(`${api}/${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); await refresh(); setMessage("Photos updated."); } catch(e) { setMessage(e instanceof Error ? e.message : "Update failed."); } finally { setBusy(false); } }
  function move(index: number, delta: number) { const next=[...cabin.images], other=index+delta; if(other<0||other>=next.length)return; [next[index],next[other]]=[next[other],next[index]]; action("images-order","PUT",{ids:next.map(i=>i.id)}); }
  return <Layout><Seo title={`Manage ${cabin.name} | Cabañas Corona`} path={`/admin/cabins/${cabin.id}`}/><main className="mx-auto max-w-[1040px] px-5 py-10"><Link href="/admin" className="font-sans text-sm underline">← Cabin admin</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><p className="font-sans text-xs font-bold uppercase tracking-[.18em] text-eyebrow">Admin</p><h1 className="m-0 text-5xl">{cabin.name}</h1></div><Link href={`/p/${cabin.id}`} className="font-sans text-sm underline">View public page</Link></div>
  <section className="mt-10 border border-cardborder bg-card p-5 sm:p-8"><h2 className="text-3xl">Descriptions</h2><p className="text-muted">Both languages are required. Formatting is limited to bold, italic, underline, headings, and lists.</p><div className="grid gap-7"><RichTextEditor id="description-es" label="Spanish" value={es} onChange={setEs}/><RichTextEditor id="description-en" label="English" value={en} onChange={setEn}/></div><button disabled={busy} onClick={saveDescriptions} className="mt-6 bg-terra px-6 py-4 font-sans text-xs font-bold uppercase text-white disabled:opacity-50">Save descriptions</button></section>
  <section className="mt-8 border border-cardborder bg-card p-5 sm:p-8"><h2 className="text-3xl">Photos</h2><p className="text-muted">JPEG, PNG, or WebP, up to 8 MB. The primary photo appears on cabin cards and detail pages.</p><label className="inline-flex cursor-pointer bg-night px-6 py-4 font-sans text-xs font-bold uppercase text-white">Upload photo<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>upload(e.target.files?.[0])}/></label><div className="mt-7 grid gap-4 sm:grid-cols-2">{cabin.images.map((image,index)=><article key={image.id} className="border border-cardborder bg-white p-3"><img src={image.url} alt="" className="h-52 w-full object-cover"/><div className="mt-3 flex flex-wrap items-center gap-2"><span className="mr-auto font-sans text-xs font-bold uppercase">{image.type === "Primary" ? "Primary" : `Photo ${index+1}`}</span><button disabled={busy||index===0} onClick={()=>move(index,-1)} aria-label="Move photo earlier" className="border px-3 py-2">↑</button><button disabled={busy||index===cabin.images.length-1} onClick={()=>move(index,1)} aria-label="Move photo later" className="border px-3 py-2">↓</button>{image.type!=="Primary"&&<button disabled={busy} onClick={()=>action("images-primary","PUT",{imageId:image.id})} className="border px-3 py-2 font-sans text-xs">Make primary</button>}<button disabled={busy} onClick={()=>window.confirm("Delete this photo permanently?")&&action("images-delete","DELETE",{imageId:image.id})} className="border border-red-700 px-3 py-2 font-sans text-xs text-red-800">Delete</button></div></article>)}</div>{!cabin.images.length&&<p className="mt-6 text-muted">No real photos yet. Public pages continue to show a labeled temporary photo.</p>}</section>{message&&<p role="status" className="sticky bottom-4 mt-5 bg-night p-4 text-white">{message}</p>}</main></Layout>;
}
