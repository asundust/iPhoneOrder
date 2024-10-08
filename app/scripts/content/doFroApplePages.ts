import {
    sleep,
    changeInputValue,
    getElemByID,
    getElemBySelectorAndText,
    restoreFromStorage,
    randomSleep,
} from '../../shared/util'
import {
    applePageUrl,
    pageElementsId,
    storeKeys,
    prefixBillingoptions,
    iframeMessagePass,
    defaultAres,
} from '../../shared/constants'
import { storeSearchInPage } from './getStoreCanPickInfo'
import type { IPHONEORDER_CONFIG } from '../../shared/interface'
// import getPageInitInfo from './getPageInitInfo'
// import goOrderSteps from './goOrderSteps'
// import { mapValues as _mapValues } from 'lodash'

// let iPhoneOrderConfig: IPHONEORDER_CONFIG = {
//     lastName: undefined,
//     firstName: undefined,
//     mobile: undefined,
//     last4code: undefined,
//     appleId: undefined, // same as email
//     password: undefined,
//     stepWait: 10,
//     // @ts-ignore
//     payBill: billTypeKeys.alipay,
//     payInstallment: 0,
//     cityName: undefined,
//     districtName: undefined,
//     provinceName: undefined,
//     employeeId: undefined,
// }

const doFroApplePages = async (url?: string) => {
    // ********** 发送消息给 tips page **********
    let iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)?.contentWindow
    let message = {
        action: iframeMessagePass.messageAction,
        handleMessage: '开始执行',
    }
    iframeWindow?.postMessage(message, '*')

    const orderEnabled = !!(await restoreFromStorage(storeKeys.orderEnabled))
    console.log(`orderEnabled in doForApplePages`, orderEnabled)
    let iframeContainer = document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement
    if (!orderEnabled) {
        if (iframeContainer) {
            iframeContainer.style.display = 'none'
        }
        return
    }

    if (iframeContainer) {
        iframeContainer.style.display = ''
    }

    const iPhoneOrderConfig: IPHONEORDER_CONFIG = await restoreFromStorage(storeKeys.orderConfig)
    await sleep(0.5)

    let queryString = new URLSearchParams(location.search.toLowerCase())
    let pathname = location.pathname
    console.log(`doFroApplePages`, queryString)

    const {
        buy: buyElems,
        checkout: checkoutElems,
        shoppingCart: shoppingCartElems,
        signIn: signInElems,
    } = pageElementsId

    // 登陆态过期，直接去购物车页
    if (/\/shop\/sorry/i.test(pathname)) {
        message.handleMessage = '登录过期，前往购物车'
        iframeWindow?.postMessage(message, '*')

        location.href = applePageUrl.shoppingCart
        return
    }

    // 购买页面
    if (/\/shop\/buy-iphone\/iphone-/i.test(pathname)) {
        console.log(`I am in buy steps`)
        while (true) {
            if (/CH\/A/i.test(location.pathname)) {
                message.handleMessage = '选择“不折抵换购”'
                iframeWindow?.postMessage(message, '*')

                console.log(`click ID noTradeIn`)
                getElemByID(buyElems.noTradeIn)?.click()
                await sleep(0.5)

                message.handleMessage = '选择“不加AppleCare”'
                iframeWindow?.postMessage(message, '*')

                console.log(`click ID noAppleCare`)
                let noCareElem = getElemBySelectorAndText(
                    '.rf-accessory-applecare-fullwidth-option',
                    '不加 AppleCare+ 服务计划'
                )
                console.log(`noCareElem ${noCareElem}`)
                const labelId = noCareElem?.querySelector('label')?.getAttribute('id')
                console.log(`labelId ${labelId}`)
                if (labelId) {
                    getElemByID(labelId)?.click()
                }
                await sleep(0.5)

                let noAppleCare = null
                let inputElement = document.querySelector(`input[name^="ao.applecare_"]`) as HTMLInputElement | null
                if (inputElement) {
                    noAppleCare = inputElement.value
                }
                console.log(`noAppleCare value ${noAppleCare}`)
                if (noAppleCare === 'none') {
                    await sleep(0.5)
                    let buttonElement = document.querySelector(`button[name="add-to-cart"]`) as HTMLInputElement | null
                    if (buttonElement) {
                        // ********** 发送消息给 tips page **********
                        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                            ?.contentWindow
                        const message = {
                            action: iframeMessagePass.messageAction,
                            handleMessage: '正在添加购物车',
                        }
                        iframeWindow?.postMessage(message, '*')

                        buttonElement?.click()
                        break
                    }
                }
            } else {
                const step_value = queryString.get('step') || ''
                if (step_value) {
                    console.log(`I am in buy after handle steps`)
                    console.info('step_value:' + step_value)
                    // 添加成功页面
                    if (step_value.includes('attach')) {
                        // ********** 发送消息给 tips page **********
                        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                            ?.contentWindow
                        const message = {
                            action: iframeMessagePass.messageAction,
                            handleMessage: '正在跳转购物车',
                        }
                        iframeWindow?.postMessage(message, '*')

                        location.href = applePageUrl.shoppingCart
                        return
                    }
                } else {
                    // ********** 发送消息给 tips page **********
                    const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                        ?.contentWindow
                    const message = {
                        action: iframeMessagePass.messageAction,
                        handleMessage: '等待用户请选择购买项',
                    }
                    iframeWindow?.postMessage(message, '*')

                    await sleep(0.5)
                    console.log(`wait for select`)
                }
            }
        }
    }

    // 在购物车页面
    if (/\/shop\/bag/i.test(pathname)) {
        let goCheckoutBtn: HTMLElement | null = getElemByID(shoppingCartElems.checkoutButton)
        if (!goCheckoutBtn && url) {
            location.href = url
            return
        }

        // ********** 发送消息给 tips page **********
        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)?.contentWindow
        const message = {
            action: iframeMessagePass.messageAction,
            handleMessage: '正在前往订单选项页面',
        }
        iframeWindow?.postMessage(message, '*')

        // await sleep(Math.random() * 2)
        goCheckoutBtn?.click()
        return
    }

    // 在登陆页
    if (/\/signin/i.test(pathname)) {
        // ********** 发送消息给 tips page **********
        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)?.contentWindow
        const message = {
            action: iframeMessagePass.messageAction,
            handleMessage: '正在登录',
        }
        iframeWindow?.postMessage(message, '*')

        if (getElemByID(signInElems.dataHandleByAppleCheckbox)) {
            const dataHandleByAppleCheckbox = getElemByID(signInElems.dataHandleByAppleCheckbox) as HTMLInputElement
            const dataOutSideMyCountryCheckbox = getElemByID(
                signInElems.dataOutSideMyCountryCheckbox
            ) as HTMLInputElement
            dataHandleByAppleCheckbox.click()
            dataHandleByAppleCheckbox.checked = true
            dataOutSideMyCountryCheckbox.click()
            dataOutSideMyCountryCheckbox.checked = true
            await sleep(0.5)
            getElemByID(signInElems.acceptButton)?.click()
        }
        await sleep(0.5)

        if (iPhoneOrderConfig.appleId && iPhoneOrderConfig.password) {
            let addIdDom = getElemByID(signInElems.appleIdInput) as HTMLInputElement
            let addCodeDom = getElemByID(signInElems.applePasswordInput) as HTMLInputElement
            let goLoginBtn = getElemByID(signInElems.loginSubmitButton)
            if (addIdDom && addCodeDom && goLoginBtn) {
                changeInputValue(addIdDom, iPhoneOrderConfig.appleId)
                changeInputValue(addCodeDom, iPhoneOrderConfig.password)
                await sleep(0.5)
                goLoginBtn.click()
            }
        } else {
            // 没有账号信息就以游客登录
            let guestLoginBtn = getElemByID(signInElems.guestLoginButon)
            if (guestLoginBtn) {
                await sleep(0.5)
                console.log(`click guestLoginBtn`, guestLoginBtn)
                guestLoginBtn.click()
            }
        }
        return
    }

    if (/\/shop\/checkout/.test(pathname)) {
        console.log(`I am in checkout steps`)
        const s_value = queryString.get('_s') || ''
        console.info('s_value:' + s_value)
        // // 选择门店
        // if (s_value.includes('fulfillment')) {
        //     let iwantpickup = getElemBySelectorAndText('div.rc-segmented-control-text', '我要取货')
        //     if (!iwantpickup && url) {
        //         location.href = url
        //         return
        //     }
        //     iwantpickup?.click()
        //
        //     let pageInfo = await getPageInitInfo()
        //     const { partNumber, x_aos_stk } = pageInfo || {}
        //     console.log(`partNumber, x_aos_stk`, partNumber, x_aos_stk)
        //     if (!partNumber || !x_aos_stk) {
        //         // 当前页面没有信息， 则刷新一下
        //         await sleep(iPhoneOrderConfig.stepWait, 'wait and reload')
        //         location.reload()
        //         return
        //     } else {
        //         // await goOrderSteps({
        //         //     partNumber,
        //         //     x_aos_stk,
        //         //     iPhoneOrderConfig,
        //         // })
        //     }
        // }

        // 为我送货
        if (s_value.includes('fulfillment-init')) {
            // 继续填写送货地址
            const { cityName, districtName, provinceName } = iPhoneOrderConfig
            if (!cityName || !districtName || !provinceName) {
                console.log(`省市区未配置`)
                return
            }

            // ********** 发送消息给 tips page **********
            const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                ?.contentWindow
            const message = {
                action: iframeMessagePass.messageAction,
                handleMessage: '检查省市区',
            }
            iframeWindow?.postMessage(message, '*')

            await storeSearchInPage({ iPhoneOrderConfig })
            while (true) {
                const locationElement = document.querySelector(`button.rs-edit-location-button`)
                if (!locationElement) {
                    console.log(`省市区未加载完成1`)
                    await sleep(1)
                    continue
                }
                if (locationElement.textContent) {
                    if (
                        locationElement.textContent.includes(districtName) &&
                        locationElement.textContent.includes(provinceName)
                    ) {
                        console.log(`reload right => ${cityName} ${districtName} ${provinceName}`)

                        // ********** 发送消息给 tips page **********
                        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                            ?.contentWindow
                        const message = {
                            action: iframeMessagePass.messageAction,
                            handleMessage: '正在前往送货详情页面',
                        }
                        iframeWindow?.postMessage(message, '*')

                        getElemByID(checkoutElems.continuebutton)?.click()
                        break
                    }
                }
                // ********** 发送消息给 tips page **********
                const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                    ?.contentWindow
                const message = {
                    action: iframeMessagePass.messageAction,
                    handleMessage: '等待省市区加载完成',
                }
                iframeWindow?.postMessage(message, '*')

                console.log(`省市区未加载完成2`)
                await sleep(1)
            }
        }

        // // 填写取货信息，个人信息 页面
        // if (s_value.includes('pickupcontact')) {
        //     let checkoutSelectPrefix = `checkout.pickupContact.selfPickupContact.selfContact.address`
        //
        //     let lastNameDom = getElemByID(checkoutElems.pickupContact.lastName) as HTMLInputElement,
        //         firstNameDom = getElemByID(checkoutElems.pickupContact.firstName) as HTMLInputElement,
        //         emailAddressDom = getElemByID(checkoutElems.pickupContact.emailAddress) as HTMLInputElement,
        //         mobileDom = getElemByID(checkoutElems.pickupContact.mobile) as HTMLInputElement,
        //         last4IdDom = getElemByID(checkoutElems.pickupContact.last4Id) as HTMLInputElement
        //     // 如果当前dom不存在，说明此时页面还没有加载出来，直接刷新页面加载
        //     if (!lastNameDom && url) {
        //         location.href = url
        //         return
        //     }
        //     changeInputValue(lastNameDom, iPhoneOrderConfig.lastName)
        //     changeInputValue(firstNameDom, iPhoneOrderConfig.firstName)
        //     changeInputValue(emailAddressDom, iPhoneOrderConfig.appleId)
        //     changeInputValue(mobileDom, iPhoneOrderConfig.mobile)
        //     changeInputValue(last4IdDom, iPhoneOrderConfig.last4code)
        //     getElemByID(checkoutElems.continuebutton)?.click()
        //     // document.querySelector(`#rs-checkout-continue-button-bottom`).click()
        //     return
        // }

        // 你的送货地址是哪里
        if (s_value.includes('shipping-init')) {
            while (true) {
                // ********** 发送消息给 tips page **********
                const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                    ?.contentWindow
                const message = {
                    action: iframeMessagePass.messageAction,
                    handleMessage: '正在前往付款详情页面',
                }
                iframeWindow?.postMessage(message, '*')

                // 继续选择付款方式（不知道为啥和上面的按钮是同一个）
                getElemByID(checkoutElems.continuebutton)?.click()
                const buttonSpinner = document.querySelector(`button.button-spinner`) as HTMLInputElement | null
                console.log(`buttonSpinner: ${buttonSpinner}`)
                if (buttonSpinner) {
                    break
                }
                await sleep(0.5)
            }
        }

        // 选择付款方式页面
        if (s_value.includes('billing-init')) {
            // ********** 发送消息给 tips page **********
            const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                ?.contentWindow
            const message = {
                action: iframeMessagePass.messageAction,
                handleMessage: '正在选择付款方式',
            }

            const { payBill, payInstallment } = iPhoneOrderConfig || {}
            let alipayBtnInput = getElemByID(checkoutElems.bill.alipay)
            let payBillBtnInput = getElemByID(checkoutElems.bill[payBill])
            if (payBillBtnInput) {
                payBillBtnInput.click()

                if (!['wechat', 'alipay'].includes(payBill)) {
                    // 有分期需求
                    // await sleep(1)
                    // const dataAutom = `${payBillBtnInput.id}-${payInstallment}`.replace(`${prefixBillingoptions}.`, '')
                    // const payInstallmentBtnInput = document.querySelector(`input[data-autom="${dataAutom}"]`)
                    // console.log(`payInstallmentBtnInput`, payInstallmentBtnInput, `input[data-autom="${dataAutom}"]`)
                    // ;(payInstallmentBtnInput as HTMLInputElement)?.click()

                    // 有分期需求
                    // 使用一个循环来不断检查 payInstallmentBtnInput 是否为 HTMLInputElement
                    while (true) {
                        // ********** 发送消息给 tips page **********
                        const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                            ?.contentWindow
                        const message = {
                            action: iframeMessagePass.messageAction,
                            handleMessage: '正在等待分期选项加载完成',
                        }
                        iframeWindow?.postMessage(message, '*')

                        await sleep(1) // 每次检查前等待 1 秒
                        const dataAutom = `${payBillBtnInput.id}-${payInstallment}`.replace(
                            `${prefixBillingoptions}.`,
                            ''
                        )
                        const payInstallmentBtnInput = document.querySelector(
                            `input[data-autom="${dataAutom}"]`
                        ) as HTMLInputElement | null
                        console.log(
                            `payInstallmentBtnInput`,
                            payInstallmentBtnInput,
                            `input[data-autom="${dataAutom}"]`
                        )
                        // 如果查询到的元素是 HTMLInputElement，则跳出循环
                        if (payInstallmentBtnInput instanceof HTMLInputElement) {
                            payInstallmentBtnInput.click() // 点击按钮
                            break // 跳出循环
                        }
                    }
                }
            } else if (alipayBtnInput) {
                // 获取不到就走默认的支付宝
                alipayBtnInput.click()
            } else if (url) {
                // 如果没有支付宝，说明页面加载没好，直接刷新
                location.href = url
                return
            }

            message.handleMessage = '正在前往检查订单页面'
            iframeWindow?.postMessage(message, '*')

            getElemByID(checkoutElems.continuebutton)?.click()
            return
        }

        // 结账review页面
        if (s_value.includes('review')) {
            let orderBtn = getElemByID(checkoutElems.continuebutton)
            if (orderBtn) {
                // ********** 发送消息给 tips page **********
                const iframeWindow = (document?.getElementById(iframeMessagePass.iframeID) as HTMLIFrameElement)
                    ?.contentWindow
                const message = {
                    action: iframeMessagePass.messageAction,
                    handleMessage: '正在下单',
                }
                iframeWindow?.postMessage(message, '*')

                orderBtn.click()
            } else if (url) {
                // 如果既没有去支付按钮，说明页面加载没好，直接刷新
                location.href = url
                return
            }

            return
        }
    }
}

export default doFroApplePages
