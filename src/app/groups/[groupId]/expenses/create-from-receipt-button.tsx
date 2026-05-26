'use client'

import { CategoryIcon } from '@/app/groups/[groupId]/expenses/category-icon'
import { ReceiptCropper } from '@/components/receipt-cropper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { ToastAction } from '@/components/ui/toast'
import { useToast } from '@/components/ui/use-toast'
import { useMediaQuery } from '@/lib/hooks'
import { ReceiptResult, scanReceipt } from '@/lib/receipt'
import { formatCurrency, formatDate, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import {
  Camera,
  ChevronRight,
  FileQuestion,
  Images,
  Loader2,
  Receipt,
  ScanSearch,
  Zap,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { PropsWithChildren, ReactNode, useRef, useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

type ModelMode = 'fast' | 'accurate'

export function CreateFromReceiptButton() {
  const t = useTranslations('CreateFromReceipt')
  const isDesktop = useMediaQuery('(min-width: 640px)')

  const DialogOrDrawer = isDesktop
    ? CreateFromReceiptDialog
    : CreateFromReceiptDrawer

  return (
    <DialogOrDrawer
      trigger={
        <Button
          size="icon"
          variant="secondary"
          title={t('Dialog.triggerTitle')}
        >
          <Receipt className="w-4 h-4" />
        </Button>
      }
      title={
        <>
          <span>{t('Dialog.title')}</span>
          <Badge className="bg-pink-700 hover:bg-pink-600 dark:bg-pink-500 dark:hover:bg-pink-600">
            Beta
          </Badge>
        </>
      }
      description={<>{t('Dialog.description')}</>}
    >
      <ReceiptDialogContent />
    </DialogOrDrawer>
  )
}

function ReceiptDialogContent() {
  const { group } = useCurrentGroup()
  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories

  const locale = useLocale()
  const t = useTranslations('CreateFromReceipt')
  const [pending, setPending] = useState(false)
  const [modelMode, setModelMode] = useState<ModelMode>('accurate')
  const [receiptInfo, setReceiptInfo] = useState<
    (ReceiptResult & { previewUrl: string }) | null
  >(null)
  const [cropSrc, setCropSrc] = useState<{ url: string; file: File } | null>(
    null,
  )
  const { toast } = useToast()
  const router = useRouter()

  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const runScan = async (base64: string, previewUrl: string) => {
    try {
      setPending(true)
      const result = await scanReceipt(base64, modelMode)
      setReceiptInfo({ ...result, previewUrl })
    } catch (err) {
      console.error(err)
      toast({
        title: t('ErrorToast.title'),
        description: t('ErrorToast.description'),
        variant: 'destructive',
        action: (
          <ToastAction
            altText={t('ErrorToast.retry')}
            onClick={() => runScan(base64, previewUrl)}
          >
            {t('ErrorToast.retry')}
          </ToastAction>
        ),
      })
    } finally {
      setPending(false)
    }
  }

  const handleFile = (file: File) => {
    setCropSrc({ url: URL.createObjectURL(file), file })
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const receiptInfoCategory =
    (receiptInfo?.categoryId &&
      categories?.find((c) => String(c.id) === receiptInfo.categoryId)) ||
    null

  return (
    <div className="prose prose-sm dark:prose-invert">
      {cropSrc && (
        <ReceiptCropper
          imageSrc={cropSrc.url}
          originalFile={cropSrc.file}
          onConfirm={(base64) => {
            const preview = cropSrc.url
            setCropSrc(null)
            runScan(base64, preview)
          }}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc.url)
            setCropSrc(null)
          }}
        />
      )}
      <p>{t('Dialog.body')}</p>
      <div>
        {/* Model selector */}
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setModelMode('fast')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              modelMode === 'fast'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary'
            }`}
          >
            <Zap className="w-3 h-3" />
            Fast
          </button>
          <button
            type="button"
            onClick={() => setModelMode('accurate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              modelMode === 'accurate'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary'
            }`}
          >
            <ScanSearch className="w-3 h-3" />
            Accurate
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onInputChange}
        />

        <div className="grid gap-x-4 gap-y-2 grid-cols-3">
          {/* Image preview / pick area */}
          <div className="row-span-3 flex flex-col gap-1.5">
            <Button
              variant="secondary"
              className="flex-1 w-full relative min-h-[80px]"
              title="Choose from gallery"
              onClick={() => galleryRef.current?.click()}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : receiptInfo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptInfo.previewUrl}
                  className="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] object-contain drop-shadow-lg"
                  alt="Scanned receipt"
                />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                  <Images className="w-5 h-5" />
                  {t('Dialog.selectImage')}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => cameraRef.current?.click()}
              disabled={pending}
            >
              <Camera className="w-3.5 h-3.5" />
              Camera
            </Button>
          </div>

          <div className="col-span-2">
            <strong>{t('Dialog.titleLabel')}</strong>
            <div>{receiptInfo ? receiptInfo.title ?? <Unknown /> : '…'}</div>
          </div>
          <div className="col-span-2">
            <strong>{t('Dialog.categoryLabel')}</strong>
            <div>
              {receiptInfo ? (
                receiptInfoCategory ? (
                  <div className="flex items-center">
                    <CategoryIcon
                      category={receiptInfoCategory}
                      className="inline w-4 h-4 mr-2"
                    />
                    <span className="mr-1">{receiptInfoCategory.grouping}</span>
                    <ChevronRight className="inline w-3 h-3 mr-1" />
                    <span>{receiptInfoCategory.name}</span>
                  </div>
                ) : (
                  <Unknown />
                )
              ) : (
                ''
              )}
            </div>
          </div>
          <div>
            <strong>{t('Dialog.amountLabel')}</strong>
            <div>
              {receiptInfo && group ? (
                receiptInfo.total ? (
                  formatCurrency(
                    getCurrencyFromGroup(group),
                    receiptInfo.total,
                    locale,
                    true,
                  )
                ) : (
                  <Unknown />
                )
              ) : (
                '…'
              )}
            </div>
          </div>
          <div>
            <strong>{t('Dialog.dateLabel')}</strong>
            <div>
              {receiptInfo ? (
                receiptInfo.date ? (
                  formatDate(
                    new Date(`${receiptInfo.date}T12:00:00.000Z`),
                    locale,
                    { dateStyle: 'medium' },
                  )
                ) : (
                  <Unknown />
                )
              ) : (
                '…'
              )}
            </div>
          </div>
        </div>
      </div>
      <p>{t('Dialog.editNext')}</p>
      <div className="text-center">
        {receiptInfo?.items && receiptInfo.items.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1 mb-2">
            ✓ {receiptInfo.items.length} item
            {receiptInfo.items.length !== 1 ? 's' : ''} detected — itemized bill
            will be pre-filled
          </p>
        )}
        <Button
          disabled={pending || !receiptInfo}
          onClick={() => {
            if (!receiptInfo || !group) return
            if (receiptInfo.items && receiptInfo.items.length > 0) {
              const items = receiptInfo.items.map((item, i) => ({
                id: `receipt-item-${i}`,
                name: item.name,
                amount: item.amount,
                sign: item.sign ?? '+',
                excludedParticipants: [],
              }))
              localStorage.setItem('pendingReceiptItems', JSON.stringify(items))
            }
            router.push(
              `/groups/${group.id}/expenses/create?amount=${
                receiptInfo.total ?? 0
              }&categoryId=${receiptInfo.categoryId}&date=${
                receiptInfo.date
              }&title=${encodeURIComponent(receiptInfo.title ?? '')}`,
            )
          }}
        >
          {t('Dialog.continue')}
        </Button>
      </div>
    </div>
  )
}

function Unknown() {
  const t = useTranslations('CreateFromReceipt')
  return (
    <div className="flex gap-1 items-center text-muted-foreground">
      <FileQuestion className="w-4 h-4" />
      <em>{t('unknown')}</em>
    </div>
  )
}

function CreateFromReceiptDialog({
  trigger,
  title,
  description,
  children,
}: PropsWithChildren<{
  trigger: ReactNode
  title: ReactNode
  description: ReactNode
}>) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
          <DialogDescription className="text-left">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CreateFromReceiptDrawer({
  trigger,
  title,
  description,
  children,
}: PropsWithChildren<{
  trigger: ReactNode
  title: ReactNode
  description: ReactNode
}>) {
  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">{title}</DrawerTitle>
          <DrawerDescription className="text-left">
            {description}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
