import { IPHONEORDER_CONFIG } from '../../shared/interface'
import { applePageUrl, iPhoneModels, fetchHeaders, defaultAres , iframeMessagePass } from '../../shared/constants'
import {sleep, randomSleep, getElemByID} from '../../shared/util'
import crossfetch from 'cross-fetch'
import { each as _each, map as _map } from 'lodash'

const fetch = crossfetch.bind(this)

/*
 *   @partNumber iPhone 型号
 *   @isNoWait 是否等待，不等待表示纯粹调用接口
 */
interface IGetStoreCanPickInfoProps {
    x_aos_stk: string
    partNumber: string
    isNoWait?: boolean
    iPhoneOrderConfig: IPHONEORDER_CONFIG
}
const getStoreCanPickInfo = async ({
    x_aos_stk,
    partNumber,
    isNoWait,
    iPhoneOrderConfig,
}: IGetStoreCanPickInfoProps) => {
    storeSearchInPage({ iPhoneOrderConfig })
    let pickupStoreInfo: Record<string, any> = {}
    const { host, protocol } = window.location || {}
    // let url = `${protocol}//www.apple.com.cn/shop/fulfillment-messages`
    let url = `/shop/checkoutx?_a=search&_m=checkout.fulfillment.pickupTab.pickup.storeLocator`

    const districtName = iPhoneOrderConfig.districtName || defaultAres.districtName
    const provinceName = iPhoneOrderConfig.provinceName || defaultAres.provinceName
    const cityName = iPhoneOrderConfig.cityName || defaultAres.cityName
    let reqQuery = {
        'parts.0': partNumber, // 型号 `MQ8G3CH/A`,
        'mts.0': `regular`,
        pl: true,
        location: `${provinceName} ${cityName} ${districtName}`,
        geoLocated: false,
        state: provinceName,
        city: cityName,
        district: districtName,
    }

    const querystring = _map(reqQuery, (value, key) => {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    }).join(`&`)

    let dataString = '',
        data = []
    const provinceCityDistrict =
        provinceName == cityName ? cityName + ' ' + districtName : provinceName + ' ' + cityName + ' ' + districtName
    data = [
        `checkout.fulfillment.pickupTab.pickup.storeLocator.showAllStores=false`,
        `checkout.fulfillment.pickupTab.pickup.storeLocator.selectStore=`,
        `checkout.fulfillment.pickupTab.pickup.storeLocator.searchInput=${encodeURIComponent(
            provinceName + ' ' + cityName + ' ' + districtName
        )}`,
        `checkout.fulfillment.pickupTab.pickup.storeLocator.address.stateCitySelectorForCheckout.city=${encodeURIComponent(
            cityName
        )}`,
        `checkout.fulfillment.pickupTab.pickup.storeLocator.address.stateCitySelectorForCheckout.state=${encodeURIComponent(
            provinceName
        )}`,
        `checkout.fulfillment.pickupTab.pickup.storeLocator.address.stateCitySelectorForCheckout.provinceCityDistrict=${encodeURIComponent(
            provinceCityDistrict
        )}`,
        `checkout.fulfillment.pickupTab.pickup.storeLocator.address.stateCitySelectorForCheckout.countryCode=CN`,
        `checkout.fulfillment.pickupTab.pickup.storeLocator.address.stateCitySelectorForCheckout.district=${encodeURIComponent(
            districtName
        )}`,
    ]
    dataString = data.join(`&`)

    let options = {
        method: 'POST',
        headers: {
            ...fetchHeaders,
            referer: applePageUrl.buyiPhone,
            'X-Aos-Model-Page': 'checkoutPage',
            'X-Aos-Stk': x_aos_stk,
        },
        credentials: 'include' as RequestCredentials,
        body: dataString,
    }

    console.log(`getStoreCanPickInfo options`, options)
    try {
        let resResult = (await fetch(url, options)) as Record<string, any>

        let pickupResults: any = {}

        // 如果请求失败， 表示被封禁
        if (![200, 301, 302].includes(Number(resResult?.status))) {
            if (!isNoWait) {
                console.log(`********** GMfetch failed, stepWait add 1 sec **********`)
                const resText = await resResult.text()
                // console.log(`resText`, resText)
                iPhoneOrderConfig.stepWait = iPhoneOrderConfig.stepWait + 1
                if (resText?.indexOf(`503 Service Temporarily Unavailable`) > -1) {
                    console.log(`********** and wait 1 min **********`)
                    // 换一个型号调用，让apple认为是正常请求
                    const iPhoneProAll = iPhoneModels.iPhone15Pro
                    const randomPartNumberiPhonePro =
                        iPhoneProAll[Math.floor(Math.random() * iPhoneProAll.length)]?.model
                    await getStoreCanPickInfo({
                        x_aos_stk,
                        partNumber: randomPartNumberiPhonePro,
                        isNoWait: true,
                        iPhoneOrderConfig,
                    })
                    await sleep(60)
                }
            } else {
                console.log(`********** GMfetch failed, NoWait failed **********`)
            }
        } else {
            const resJson = await resResult.json()
            console.log(`resJson`, resJson)
            pickupResults =
                resJson?.body?.checkout?.fulfillment?.pickupTab?.pickup?.storeLocator?.searchResults?.d || {}
        }

        let partPickupStores = pickupResults?.retailStores || [],
            pickupNumbers = ''
        _each(partPickupStores, store => {
            const {
                retailAddress,
                storeDisabled,
                pickupMessages,
                availability,
                storeId: storeNumber,
                storeName,
            } = store || {}
            const { availableNowForAllLines } = availability || {}
            const { city } = retailAddress || {}
            // 有时候会搜出周边城市，这里用于排除周边城市
            const isInCity = city == cityName
            if (isInCity && pickupMessages?.length && (!storeDisabled || availableNowForAllLines)) {
                pickupStoreInfo = {
                    ...pickupStoreInfo,
                    storeNumber,
                    storeName,
                    availableNowForAllLines,
                }
                return false
            }
        })
    } catch (e) {
        console.log(e)
        if (!isNoWait) {
            console.log(`********** GMfetch failed, stepWait add 1 sec, and wait 1 min **********`)
            iPhoneOrderConfig.stepWait = iPhoneOrderConfig.stepWait + 1
            // 换一个型号调用，让apple认为是正常请求
            const iPhoneProAll = iPhoneModels.iPhone15Pro
            const randomPartNumberiPhonePro = iPhoneProAll[Math.floor(Math.random() * iPhoneProAll.length)]?.model
            await getStoreCanPickInfo({
                x_aos_stk,
                partNumber: randomPartNumberiPhonePro,
                isNoWait: true,
                iPhoneOrderConfig,
            })
            await sleep(10)
        } else {
            console.log(`********** GMfetch failed, NoWait failed **********`)
        }
    }

    console.log(`pickupStoreInfo`, pickupStoreInfo)
    return pickupStoreInfo
}

export default getStoreCanPickInfo

interface IStoreSearchInPageProps {
    iPhoneOrderConfig: IPHONEORDER_CONFIG
}

const randomRange = 2
export const storeSearchInPage = async ({ iPhoneOrderConfig }: IStoreSearchInPageProps) => {
    const locationElement = document.querySelector(`button.rs-edit-location-button`)
    if (!locationElement) return
    const { cityName, districtName, provinceName } = iPhoneOrderConfig
    console.log(`config => ${cityName} ${districtName} ${provinceName}`)
    if (!cityName || !districtName || !provinceName) return

    // 已纠正的情况下，不需要重复点击了
    if (locationElement.textContent) {
        if (locationElement.textContent.includes(districtName) && locationElement.textContent.includes(provinceName)) {
            console.log(`check right => ${cityName} ${districtName} ${provinceName}`)
            return
        }
    }

    // ********** 发送消息给 tips page **********
    const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)?.contentWindow
    const message = {
        action: iframeMessagePass.messageAction,
        handleMessage: '开始选择省市区'
    }
    iframeWindow?.postMessage(message, '*')

    await randomSleep({ min: 0, max: randomRange })
    const isSelectionOpen = document.querySelectorAll(`li[role="listitem"]>button`)?.length > 0

    if (!isSelectionOpen) {
        ;(locationElement as HTMLButtonElement).click()
    }

    await randomSleep({ min: 0, max: randomRange })
    let hasTheProvince = false
    if (provinceName) {
        // ********** 发送消息给 tips page **********
        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)?.contentWindow
        const message = {
            action: iframeMessagePass.messageAction,
            handleMessage: '开始选择省'
        }
        iframeWindow?.postMessage(message, '*')

        while (true) {
            const provinceItems = document.querySelectorAll(`li[role="listitem"]>button`)
            _each(provinceItems, p_item => {
                if (p_item?.textContent?.includes(provinceName)) {
                    ;(p_item as HTMLButtonElement)?.click()
                    hasTheProvince = true
                    return false
                }
            })
            if (hasTheProvince) {
                break
            }
            console.log(`wait loading province`)
            await randomSleep({ min: 0, max: randomRange })
        }
    }

    let hasTheCityName = false
    if (hasTheProvince && cityName && cityName != provinceName) {
        // ********** 发送消息给 tips page **********
        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)?.contentWindow
        const message = {
            action: iframeMessagePass.messageAction,
            handleMessage: '开始选择市'
        }
        iframeWindow?.postMessage(message, '*')

        while (true) {
            const cityItems = document.querySelectorAll(`li[role="listitem"]>button`)
            _each(cityItems, p_item => {
                if (p_item?.textContent?.includes(cityName)) {
                    ;(p_item as HTMLButtonElement)?.click()
                    hasTheCityName = true
                    return false
                }
            })
            if (hasTheCityName) {
                break
            }
            console.log(`wait loading city`)
            await randomSleep({ min: 0, max: randomRange })
        }
    }

    let hasTheDistrictName = false
    if (districtName) {
        while (true) {
            // ********** 发送消息给 tips page **********
            const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)?.contentWindow
            const message = {
                action: iframeMessagePass.messageAction,
                handleMessage: '开始选择区'
            }
            iframeWindow?.postMessage(message, '*')

            const districtItems = document.querySelectorAll(`li[role="listitem"]>button`)
            _each(districtItems, p_item => {
                if (p_item?.textContent?.includes(districtName)) {
                    ;(p_item as HTMLButtonElement)?.click()
                    hasTheDistrictName = true
                    return false
                }
            })
            if (hasTheDistrictName) {
                break
            }
            console.log(`wait loading district`)
            await randomSleep({min: 0, max: randomRange})
        }
    }
}
