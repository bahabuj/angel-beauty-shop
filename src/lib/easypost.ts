import EasyPost from '@easypost/api'

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY
type EasyPostClient = InstanceType<typeof EasyPost>
let _client: EasyPostClient | null = null

export class EasyPostConfigError extends Error {}
export class EasyPostAPIError extends Error {}

function getClient(): EasyPostClient {
  if (!EASYPOST_API_KEY || EASYPOST_API_KEY.trim() === '') {
    throw new EasyPostConfigError('EasyPost API key is not configured.')
  }
  if (!_client) _client = new EasyPost(EASYPOST_API_KEY)
  return _client
}

export interface ShipToAddress {
  street: string; city: string; state?: string; zip: string; country?: string
}

export interface ParcelInfo {
  weightOz: number; lengthIn: number; widthIn: number; heightIn: number
}

export interface CarrierRate {
  rateId: string; shipmentId: string; carrier: string; service: string
  rate: number; deliveryDays?: number; estDeliveryDate?: string
}

const DEFAULT_FROM = {
  street: process.env.EASYPOST_FROM_STREET || '246 Union St',
  city: process.env.EASYPOST_FROM_CITY || 'Lynn',
  state: process.env.EASYPOST_FROM_STATE || 'MA',
  zip: process.env.EASYPOST_FROM_ZIP || '01901',
  country: 'US',
}

const SUPPORTED_CARRIERS = ['USPS', 'UPS', 'FedEx', 'DHL']

export async function getRates(to: ShipToAddress, parcel: ParcelInfo) {
  const client = getClient()
  let shipment: any
  try {
    shipment = await client.Shipment.create({
      to_address: { street1: to.street, city: to.city, state: to.state, zip: to.zip, country: to.country || 'US' },
      from_address: { street1: DEFAULT_FROM.street, city: DEFAULT_FROM.city, state: DEFAULT_FROM.state, zip: DEFAULT_FROM.zip, country: DEFAULT_FROM.country },
      parcel: { weight: parcel.weightOz, length: parcel.lengthIn, width: parcel.widthIn, height: parcel.heightIn },
      carriers: SUPPORTED_CARRIERS,
    })
  } catch (err: any) {
    console.error('[EasyPost] Shipment creation failed:', err?.message || err)
    throw new EasyPostAPIError(`EasyPost could not calculate rates. ${err?.message || ''}`)
  }

  if (!shipment?.rates?.length) throw new EasyPostAPIError('No shipping rates returned for this address.')

  const rates: CarrierRate[] = shipment.rates
    .filter((r: any) => SUPPORTED_CARRIERS.includes(r.carrier))
    .map((r: any) => ({
      rateId: r.id, shipmentId: shipment.id, carrier: r.carrier, service: r.service,
      rate: parseFloat(r.rate), deliveryDays: r.delivery_days ? parseInt(r.delivery_days) : undefined,
      estDeliveryDate: r.est_delivery_date || undefined,
    }))
    .sort((a: CarrierRate, b: CarrierRate) => a.rate - b.rate)

  if (!rates.length) throw new EasyPostAPIError('No USPS/UPS/FedEx/DHL rates available for this destination.')
  return { shipmentId: shipment.id, rates }
}

export async function getRateById(shipmentId: string, rateId: string): Promise<CarrierRate | null> {
  const client = getClient()
  let shipment: any
  try { shipment = await client.Shipment.retrieve(shipmentId) }
  catch (err: any) { throw new EasyPostAPIError(`Could not retrieve shipment ${shipmentId}.`) }
  const rate = (shipment.rates || []).find((r: any) => r.id === rateId)
  if (!rate || !SUPPORTED_CARRIERS.includes(rate.carrier)) return null
  return {
    rateId: rate.id, shipmentId: shipment.id, carrier: rate.carrier, service: rate.service,
    rate: parseFloat(rate.rate), deliveryDays: rate.delivery_days ? parseInt(rate.delivery_days) : undefined,
    estDeliveryDate: rate.est_delivery_date || undefined,
  }
}

export async function buyLabel(shipmentId: string, rateId: string) {
  const client = getClient()
  let shipment: any
  try { shipment = await client.Shipment.buy(shipmentId, rateId) }
  catch (err: any) { throw new EasyPostAPIError(`Could not purchase label. ${err?.message || ''}`) }
  if (!shipment?.postage_label) throw new EasyPostAPIError('EasyPost did not return a label.')
  return {
    labelUrl: shipment.postage_label.label_url,
    trackingCode: shipment.tracking_code || shipment.postage_label.tracking_code || '',
    trackingUrl: shipment.tracker?.public_url,
    carrier: shipment.selected_rate?.carrier || '',
    service: shipment.selected_rate?.service || '',
  }
}

export function isEasyPostConfigured(): boolean {
  return !!(EASYPOST_API_KEY && EASYPOST_API_KEY.trim() !== '')
}
