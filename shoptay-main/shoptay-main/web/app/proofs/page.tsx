"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Navbar from "../components/Navbar"
import {
  ShieldCheck,
  ImageIcon,
  ExternalLink,
  Loader2,
  Home,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Edit2,
  Check,
  Upload,
} from "lucide-react"
import { formatPrice } from "@/lib/timezones"

interface ProofItem {
  name: string
  packQuantity: number
  deliveredLabel: string
  lineTotal: number
}

interface Proof {
  id: string
  totalAmount: number
  items: ProofItem[]
  imageUrls: string[]
}

interface ProofsResponse {
  page: number
  hasMore: boolean
  items: Proof[]
}

const ITEMS_PER_PAGE = 12
const ADMIN_IDS = ["1146730730060271736", "1005326332001009784"]

export default function ProofsPage() {
  const [proofs, setProofs] = useState<Proof[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [lightbox, setLightbox] = useState<{ proofIndex: number; imageIndex: number } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminToken, setAdminToken] = useState<string | null>(null)
  const [editingProofId, setEditingProofId] = useState<string | null>(null)
  const [editingItems, setEditingItems] = useState<ProofItem[]>([])
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)

  const fetchProofs = async (pageNum: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shop/proofs?page=${pageNum}&limit=${ITEMS_PER_PAGE}`, {
        cache: "no-store",
      })
      const data: ProofsResponse = await res.json()
      setProofs(Array.isArray(data.items) ? data.items : [])
      setHasMore(Boolean(data.hasMore))
      setPage(Number(data.page || pageNum))
    } catch (error) {
      console.error("Failed to fetch proofs:", error)
    } finally {
      setLoading(false)
    }
  }

  const detectAdmin = useCallback(() => {
    try {
      const token = localStorage.getItem("discordToken")
      const rawUser = localStorage.getItem("discordUser")
      if (!rawUser || !token) return
      const user = JSON.parse(rawUser)
      const discordId = String(user?.discordId || "").trim()
      if (ADMIN_IDS.includes(discordId)) {
        setIsAdmin(true)
        setAdminToken(token)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchProofs(1)
    detectAdmin()
  }, [detectAdmin])

  const handlePrevPage = () => {
    if (page > 1) void fetchProofs(page - 1)
  }

  const handleNextPage = () => {
    if (hasMore) void fetchProofs(page + 1)
  }

  const openLightbox = (proofIndex: number, imageIndex: number) => {
    setClosing(false)
    setLightbox({ proofIndex, imageIndex })
  }

  const closeLightbox = () => {
    setClosing(true)
    setTimeout(() => {
      setLightbox(null)
      setClosing(false)
    }, 180)
  }

  const activeProof = lightbox ? proofs[lightbox.proofIndex] : null
  const activeImages = activeProof?.imageUrls || []
  const activeIndex = lightbox?.imageIndex ?? 0

  const prevImage = () => {
    if (!lightbox || activeImages.length <= 1) return
    setLightbox({
      ...lightbox,
      imageIndex: (lightbox.imageIndex - 1 + activeImages.length) % activeImages.length,
    })
  }

  const nextImage = () => {
    if (!lightbox || activeImages.length <= 1) return
    setLightbox({
      ...lightbox,
      imageIndex: (lightbox.imageIndex + 1) % activeImages.length,
    })
  }

  const startEdit = (proof: Proof) => {
    setEditingProofId(proof.id)
    setEditingItems(proof.items.map((item) => ({ ...item })))
  }

  const cancelEdit = () => {
    setEditingProofId(null)
    setEditingItems([])
  }

  const updateEditingItem = (index: number, field: keyof ProofItem, value: string | number) => {
    setEditingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const saveEdit = async (proofId: string) => {
    if (!adminToken) return
    setSaving(true)
    try {
      const res = await fetch(`/api/shop/proofs/${proofId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ items: editingItems }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Save failed")

      setProofs((prev) =>
        prev.map((proof) =>
          proof.id === proofId
            ? {
                ...proof,
                items: editingItems,
                totalAmount: editingItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
              }
            : proof
        )
      )
      cancelEdit()
    } catch (error) {
      console.error("Save proof failed:", error)
    } finally {
      setSaving(false)
    }
  }

  const deleteProof = async (proofId: string) => {
    if (!adminToken || !confirm("Xóa proof này?")) return
    try {
      const res = await fetch(`/api/shop/proofs/${proofId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (!res.ok) return
      setProofs((prev) => prev.filter((proof) => proof.id !== proofId))
    } catch (error) {
      console.error("Delete proof failed:", error)
    }
  }

  const uploadProofImage = async (proofId: string, file: File | null, replaceIndex?: number) => {
    if (!adminToken || !file) return
    setUploadingImage(`${proofId}:${replaceIndex ?? "add"}`)
    try {
      const form = new FormData()
      form.append("image", file)
      if (replaceIndex !== undefined) form.append("replaceIndex", String(replaceIndex))
      const res = await fetch(`/api/shop/proofs/${proofId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Upload failed")
      await fetchProofs(page)
    } catch (error) {
      console.error("Upload proof image failed:", error)
    } finally {
      setUploadingImage(null)
    }
  }

  const deleteProofImage = async (proofId: string, imageIndex: number) => {
    if (!adminToken || !confirm("Delete this proof image?")) return
    setUploadingImage(`${proofId}:${imageIndex}`)
    try {
      const res = await fetch(`/api/shop/proofs/${proofId}/images/${imageIndex}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      if (!res.ok) throw new Error("Delete image failed")
      await fetchProofs(page)
    } catch (error) {
      console.error("Delete proof image failed:", error)
    } finally {
      setUploadingImage(null)
    }
  }

  const getGalleryGridClass = (count: number) => {
    if (count <= 1) return "grid-cols-1"
    return "grid-cols-2"
  }

  const getImageSpanClass = (count: number, index: number) => {
    void count
    void index
    return ""
  }

  const pageLabel = useMemo(() => `Trang ${page}`, [page])

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between animate-fade-in-up">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-[14px] bg-[#111111] px-4 py-2 transition-colors hover:bg-[#1E1E1E]"
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">Home</span>
            </Link>

            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <ShieldCheck className="h-8 w-8 text-[#3DDC84]" />
              Proofs
            </h1>
          </div>

          <a
            href="https://discord.com/channels/1398984938111369256/1399154220434853969"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-[14px] bg-[#2F9BE6] px-4 py-2 font-medium text-white transition-colors hover:bg-[#49B6FF]"
          >
            <ExternalLink className="h-5 w-5" />
            Vouch Channel
          </a>
        </div>

        {loading && proofs.length === 0 && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-[#2F9BE6]" />
          </div>
        )}

        {!loading && proofs.length === 0 && (
          <div className="animate-fade-in py-20 text-center">
            <ImageIcon className="mx-auto mb-4 h-16 w-16 text-[#B5B5B5]/50" />
            <p className="text-xl text-[#B5B5B5]/80">No proofs yet</p>
          </div>
        )}

        {!loading && proofs.length > 0 && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {proofs.map((proof, idx) => {
                const isEditing = editingProofId === proof.id
                const currentItems = isEditing ? editingItems : proof.items
                const currentTotal = isEditing
                  ? editingItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
                  : proof.totalAmount

                return (
                  <div
                    key={proof.id}
                    className="animate-vouch-entrance rounded-[16px] border border-[#1E1E1E]/60 bg-[#111111]/90 p-5 backdrop-blur-sm transition-all hover:border-[#1E1E1E]/50"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    {proof.imageUrls.length > 0 ? (
                      <div className={`mb-4 grid gap-2 ${getGalleryGridClass(proof.imageUrls.length)}`}>
                        {proof.imageUrls.slice(0, 2).map((url, imageIndex) => (
                          <div key={imageIndex} className={`group relative overflow-hidden rounded-[14px] bg-[#161616]/60 ${getImageSpanClass(proof.imageUrls.length, imageIndex)}`}>
                            <button
                              type="button"
                              onClick={() => openLightbox(idx, imageIndex)}
                              className="block w-full"
                            >
                              <img
                                src={url}
                                alt={`Proof ${imageIndex + 1}`}
                                className="h-auto max-h-[420px] w-full object-contain transition duration-200 group-hover:scale-[1.015] group-hover:opacity-90"
                                loading="lazy"
                              />
                            </button>
                            {isAdmin && (
                              <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                                <label className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[#111111]/90 text-white hover:bg-[#2F9BE6]" title="Replace image">
                                  {uploadingImage === `${proof.id}:${imageIndex}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      void uploadProofImage(proof.id, e.target.files?.[0] || null, imageIndex)
                                      e.currentTarget.value = ""
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => void deleteProofImage(proof.id, imageIndex)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded bg-[#111111]/90 text-white hover:bg-[#FF4D4F]"
                                  title="Delete image"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-4 flex h-32 w-full items-center justify-center rounded-[14px] bg-[#161616]/80">
                        <ImageIcon className="h-8 w-8 text-[#B5B5B5]/60" />
                      </div>
                    )}

                    <div className="mb-3 space-y-2">
                      {currentItems.map((item, itemIndex) =>
                        isEditing ? (
                          <div
                            key={itemIndex}
                            className="space-y-2 rounded-[14px] border border-[#1E1E1E] bg-[#050505]/60 p-2"
                          >
                            <input
                              value={item.name}
                              onChange={(e) => updateEditingItem(itemIndex, "name", e.target.value)}
                              className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-2 py-1 text-sm text-white outline-none"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={item.lineTotal}
                              onChange={(e) =>
                                updateEditingItem(itemIndex, "lineTotal", Number(e.target.value || 0))
                              }
                              className="w-full rounded border border-[#1E1E1E] bg-[#111111] px-2 py-1 text-sm text-white outline-none"
                            />
                          </div>
                        ) : (
                          <div key={itemIndex} className="flex justify-between gap-3 text-sm">
                            <div>
                              <span className="text-[#B5B5B5]">{item.name}</span>
                              <p className="mt-1 text-xs text-[#2F9BE6]">Qty: {item.deliveredLabel}</p>
                            </div>
                            <span className="text-[#B5B5B5]/80">{formatPrice(item.lineTotal, "USD")}</span>
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-[#1E1E1E] pt-3">
                      <span className="text-lg font-bold text-[#3DDC84]">
                        {formatPrice(currentTotal, "USD")}
                      </span>

                      {isAdmin && (
                        <div className="flex gap-1.5">
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded bg-[#1E1E1E] px-2 py-1.5 text-xs text-white transition-colors hover:bg-[#2F9BE6]" title="Add proof image">
                            {uploadingImage === `${proof.id}:add` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            Add
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                void uploadProofImage(proof.id, e.target.files?.[0] || null)
                                e.currentTarget.value = ""
                              }}
                            />
                          </label>
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void saveEdit(proof.id)}
                                disabled={saving}
                                className="rounded bg-[#3DDC84] p-1.5 text-white transition-colors hover:bg-[#3DDC84]/90 disabled:opacity-50"
                                title="Lưu"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded bg-[#1E1E1E] p-1.5 text-white transition-colors hover:bg-[#1E1E1E]"
                                title="Hủy"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(proof)}
                                className="rounded bg-[#1E1E1E] p-1.5 text-white transition-colors hover:bg-[#49B6FF]"
                                title="Sửa"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteProof(proof.id)}
                                className="rounded bg-[#1E1E1E] p-1.5 text-white transition-colors hover:bg-[#FF4D4F]/90"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-center gap-4 animate-fade-in">
              <button
                onClick={handlePrevPage}
                disabled={page === 1 || loading}
                className="flex items-center gap-2 rounded-[14px] bg-[#111111] px-4 py-2 font-medium text-white transition-colors hover:bg-[#1E1E1E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
                Previous
              </button>

              <span className="font-medium text-[#B5B5B5]/80">{pageLabel}</span>

              <button
                onClick={handleNextPage}
                disabled={!hasMore || loading}
                className="flex items-center gap-2 rounded-[14px] bg-[#111111] px-4 py-2 font-medium text-white transition-colors hover:bg-[#1E1E1E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
      </div>

      {lightbox && activeImages.length > 0 && (
        <div
          className={
            "fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 " +
            (closing ? "animate-fade-out" : "animate-fade-in")
          }
          onClick={closeLightbox}
        >
          <button
            className="absolute right-4 top-4 rounded-[14px] bg-[#111111] p-2 transition-colors hover:bg-[#1E1E1E]"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {activeImages.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-[#111111]/90 p-3"
              onClick={(e) => {
                e.stopPropagation()
                prevImage()
              }}
            >
              <ChevronLeft className="h-8 w-8 text-white" />
            </button>
          )}

          <img
            src={activeImages[activeIndex]}
            alt={`Proof ${activeIndex + 1}`}
            className={
              "max-h-[90vh] max-w-[90vw] rounded-[14px] object-contain " +
              (closing ? "animate-modal-zoom-out" : "animate-modal-zoom-in")
            }
            onClick={(e) => e.stopPropagation()}
          />

          {activeImages.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-[#111111]/90 p-3"
              onClick={(e) => {
                e.stopPropagation()
                nextImage()
              }}
            >
              <ChevronRight className="h-8 w-8 text-white" />
            </button>
          )}

          {activeImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[#111111]/90 px-4 py-2 text-sm font-medium text-white">
              {activeIndex + 1} / {activeImages.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
