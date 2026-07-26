import { ZxcvbnFactory, type OptionsType } from '@zxcvbn-ts/core'
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common'
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en'

const options = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  useLevenshteinDistance: true,
} satisfies OptionsType
const zxcvbn = new ZxcvbnFactory(options)

export const passwordStrength = (password: string) => zxcvbn.check(password)
