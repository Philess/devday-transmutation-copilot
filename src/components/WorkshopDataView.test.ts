// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createDemoSales } from '../data/sales'
import WorkshopDataView from './WorkshopDataView.vue'

describe('WorkshopDataView', () => {
  it('shows the sales dashboard while keeping the raw register available', () => {
    const dataset = createDemoSales()
    const wrapper = mount(WorkshopDataView, { props: { dataset } })

    expect(wrapper.text()).toContain('Tableau de bord des ventes')
    expect(wrapper.text()).toContain('Les commandes affichées sont fictives')
    expect(wrapper.find('#data-collection').exists()).toBe(true)
    expect(wrapper.get('pre').text()).toContain(dataset.orders[0]!.id)
  })
})
