import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MdDelete, MdAdd, MdCalculate } from 'react-icons/md'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts'
import {
  Divider,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Typography,
  Container,
  Button,
  Box
} from '@mui/joy'
import Link from 'next/link'
import Layout from './layout'
import Head from 'next/head'

const MotionBox = motion(Box)

const sectionsSchema = z.object({
  amplitude: z.number().positive(),
  time: z.number().positive(),
  sections: z
    .tuple([
      z.object({
        impedances: z.object({
          before: z.number().nonnegative(),
          after: z
            .string()
            .min(1)
            .transform(value =>
              value.at(-1) === ','
                ? value.substring(0, value.length - 1)
                : value
            )
            .refine(
              value => {
                return !value.split(',').some(res => isNaN(+res))
              },
              {
                message: 'Invalid impedances'
              }
            )
        })
      })
    ])
    .rest(
      z.object({
        impedances: z.object({
          after: z.string().min(1)
        }),
        length: z.number().positive(),
        velocity: z.number().positive()
      })
    )
})

const makeSection = (length = 0) => {
  return length === 0
    ? {
        impedances: {
          before: null,
          after: ''
        }
      }
    : {
        impedances: {
          after: ''
        },
        length: null,
        velocity: null
      }
}

type FieldValues = {
  amplitude: number
  time: number
  sections: [
    {
      impedances: {
        before: null | number
        after: string
      }
    },
    ...{
      length: null | number
      impedances: {
        after: string
      }
      velocity: null | number
    }[]
  ]
}

const IndexPage = () => {
  const {
    control,
    register,
    formState: { errors },
    handleSubmit,
    getValues
  } = useForm<FieldValues>({
    defaultValues: {
      sections: [makeSection()]
    },
    resolver: zodResolver(sectionsSchema)
    // mode: 'onChange'
  })

  // TODO: types
  const [resutls, setResults] = useState<{
    voltageResults: {
      time: number
      voltage: number
    }[][]
    currentResults: {
      time: number
      current: number
    }[][][]
  }>()

  const {
    fields: sections,
    append,
    remove
  } = useFieldArray({
    control,
    name: 'sections'
  })

  const addSection = () => {
    append(makeSection())
  }
  const calculateCurrentLattice = (
    sections: {
      propagationTime: number
      forwardRho: number
      forwardTau: number
      reverseRho: number
      reverseTau: number
      z1: number
      z2: number
      impedancesBefore: number[]
      impedancesAfter: number[]
    }[],
    voltage: number,
    sectionIndex: number = 0,
    time: number = 0,
    direction: 'F' | 'R' = 'F'
  ) => {
    const results: {
      time: number
      current: number
    }[][][] = []

    for (let i = 0; i < getValues('sections').length; i++) {
      results.push([])
      for (let j = 0; j < sections[i].impedancesAfter.length; j++) {
        results[i].push([])
      }
    }
    const executionTime = getValues('time')

    const _calculate = (
      sections: {
        propagationTime: number
        forwardRho: number
        forwardTau: number
        reverseRho: number
        reverseTau: number
        z1: number
        z2: number
        impedancesBefore: number[]
        impedancesAfter: number[]
      }[],
      voltage: number,
      sectionIndex: number = 0,
      time: number = 0,
      direction: 'F' | 'R' = 'F'
    ) => {
      if (time > executionTime) return
      const section = sections[sectionIndex]
      let tau = direction === 'F' ? section.forwardTau : section.reverseTau
      let rho = direction === 'F' ? section.forwardRho : section.reverseRho

      const transmittedVoltage = voltage * tau
      const reflectedVoltage = voltage * rho
      for (const [
        impedanceIndex,
        impedance
      ] of section.impedancesAfter.entries()) {
        results[sectionIndex][impedanceIndex].push({
          time,
          current:
            ((direction === 'F'
              ? transmittedVoltage
              : -1 * transmittedVoltage) *
              1000) /
            (direction === 'F' ? impedance : section.impedancesBefore[0])
        })
      }

      // if not the last section, go more forward
      if (sectionIndex < sections.length - 1)
        _calculate(
          sections,
          direction === 'F' ? transmittedVoltage : reflectedVoltage,
          sectionIndex + 1,
          time + sections[sectionIndex + 1].propagationTime
        )
      // if not the first section, you can go backward (reverse)
      if (sectionIndex > 0)
        _calculate(
          sections,
          direction === 'F' ? reflectedVoltage : transmittedVoltage,
          sectionIndex - 1,
          time + section.propagationTime,
          'R'
        )
    }

    _calculate(sections, voltage, sectionIndex, time, direction)
    // console.log(results)
    return results.map((section, j) => {
      section = section.map(branch => branch.sort((a, b) => a.time - b.time)) // sort by time
      const s: typeof section = []

      for (const [branchIndex, branch] of section.entries()) {
        s.push([])
        for (const [pointIndex, point] of branch.entries()) {
          // console.log(s)
          // force start from zero
          if (pointIndex === 0 && point.time !== 0)
            s[branchIndex].push({
              time: 0,
              current: 0
            })
          if (pointIndex > 0) {
            if (s[branchIndex].at(-1)!.time === point.time)
              s[branchIndex].at(-1)!.current += point.current
            else
              s[branchIndex].push({
                ...point,
                current: point.current + s[branchIndex].at(-1)!.current
              })
          } else s[branchIndex].push(point)
          // force end to execution time
          if (
            pointIndex === section[branchIndex].length - 1 &&
            point.time !== executionTime
          )
            s[branchIndex].push({
              time: executionTime,
              current: s[branchIndex].at(-1)!.current
            })
        }
      }
      return s
    })
  }

  const calculateLattice = (
    sections: {
      propagationTime: number
      forwardRho: number
      forwardTau: number
      reverseRho: number
      reverseTau: number
      z1: number
      z2: number
      impedancesBefore: number[]
      impedancesAfter: number[]
    }[],
    voltage: number,
    sectionIndex: number = 0,
    time: number = 0,
    direction: 'F' | 'R' = 'F'
  ) => {
    const results: {
      time: number
      voltage: number
    }[][] = []

    for (let i = 0; i < getValues('sections').length; i++) results.push([])
    const executionTime = getValues('time')

    const _calculate = (
      sections: {
        propagationTime: number
        forwardRho: number
        forwardTau: number
        reverseRho: number
        reverseTau: number
        z1: number
        z2: number
        impedancesBefore: number[]
        impedancesAfter: number[]
      }[],
      voltage: number,
      sectionIndex: number = 0,
      time: number = 0,
      direction: 'F' | 'R' = 'F'
    ) => {
      if (time > executionTime) return
      const section = sections[sectionIndex]
      let tau = direction === 'F' ? section.forwardTau : section.reverseTau
      let rho = direction === 'F' ? section.forwardRho : section.reverseRho

      const transmittedVoltage = voltage * tau
      const reflectedVoltage = voltage * rho

      results[sectionIndex].push({
        time,
        voltage: transmittedVoltage
      })

      // if not the last section, go more forward
      if (sectionIndex < sections.length - 1)
        _calculate(
          sections,
          direction === 'F' ? transmittedVoltage : reflectedVoltage,
          sectionIndex + 1,
          time + sections[sectionIndex + 1].propagationTime
        )
      // if not the first section, you can go backward (reverse)
      if (sectionIndex > 0)
        _calculate(
          sections,
          direction === 'F' ? reflectedVoltage : transmittedVoltage,
          sectionIndex - 1,
          time + section.propagationTime,
          'R'
        )
    }

    _calculate(sections, voltage, sectionIndex, time, direction)
    return results.map(section => {
      section = [...section].sort((a, b) => a.time - b.time) // sort by time
      const s: typeof section = []

      for (const [i, point] of section.entries()) {
        // force start from zero
        if (i === 0 && point.time !== 0)
          s.push({
            time: 0,
            voltage: 0
          })
        if (i > 0) {
          if (s.at(-1)!.time === point.time) s.at(-1)!.voltage += point.voltage
          else
            s.push({
              ...point,
              voltage: point.voltage + s.at(-1)!.voltage
            })
        } else s.push(point)
        // force end to execution time
        if (i === section.length - 1 && point.time !== executionTime)
          s.push({
            time: executionTime,
            voltage: s.at(-1)!.voltage
          })
      }
      return s
    })
  }

  const onSubmit = (_data: FieldValues) => {
    const data = _data as z.infer<typeof sectionsSchema>

    const sections: {
      propagationTime: number
      forwardRho: number
      forwardTau: number
      reverseRho: number
      reverseTau: number
      z1: number
      z2: number
      impedancesBefore: number[]
      impedancesAfter: number[]
    }[] = []

    for (let [i, section] of data.sections.entries()) {
      let propagationTime = 0
      let impedancesBefore: number[]
      let z1: number
      if (i === 0) {
        section = section as {
          impedances: {
            before: number
            after: string
          }
        }
        impedancesBefore = [(section.impedances as any).before]
        z1 = impedancesBefore.reduce((acc, val) => acc + 1 / Number(val), 0)
      } else {
        section = section as {
          length: number
          impedances: {
            after: string
          }
          velocity: number
        }
        propagationTime = (section as any).length / (section as any).velocity
        impedancesBefore = [...sections[i - 1].impedancesAfter]
        z1 = sections[i - 1].z2
      }
      const impedancesAfter = section.impedances.after.split(',').map(Number)
      const z2 = impedancesAfter.reduce((acc, val) => acc + 1 / Number(val), 0)
      const num = z1 - z2
      const denom = z1 + z2
      const forwardRho =
        impedancesBefore.length === 0 && impedancesBefore[0] === 0
          ? 1
          : num / denom
      const forwardTau = 1 + forwardRho
      const reverseRho = -forwardRho
      const reverseTau = 1 + reverseRho

      sections.push({
        propagationTime,
        forwardRho,
        forwardTau,
        reverseRho,
        reverseTau,
        z1,
        z2,
        impedancesBefore,
        impedancesAfter
      })
    }
    // console.log(sections)
    const voltageResults = calculateLattice(sections, data.amplitude)

    const currentResults = calculateCurrentLattice(sections, data.amplitude)
    console.log(currentResults)

    setResults({
      voltageResults,
      currentResults
    })
  }

  return (
    <Layout>
      <Head>
        <title>Lattice builder</title>
      </Head>
      <Container>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography level='h1'>Lattice Solver</Typography>
          <Button href='/about' component={Link} variant='plain'>
            About
          </Button>
        </Box>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl sx={{ mb: 1 }}>
            <FormLabel htmlFor='amplitude'>Wave amplitude</FormLabel>
            <Input
              {...register('amplitude', {
                valueAsNumber: true
              })}
              id='amplitude'
              error={!!errors.amplitude}
              endDecorator={
                <>
                  <Divider orientation='vertical' />
                  <Typography sx={{ ml: 1.5 }}>KV</Typography>
                </>
              }
            />
            <FormHelperText>{errors.amplitude?.message}</FormHelperText>
          </FormControl>
          <FormControl sx={{ mb: 1 }}>
            <FormLabel htmlFor='time'>Execution time</FormLabel>
            <Input
              {...register('time', {
                valueAsNumber: true
              })}
              id='time'
              error={!!errors.time}
              endDecorator={
                <>
                  <Divider orientation='vertical' />
                  <Typography sx={{ ml: 1.5 }}>µs</Typography>
                </>
              }
            />
            <FormHelperText>{errors.amplitude?.message}</FormHelperText>
          </FormControl>
          <Typography level='h3' sx={{ mb: 0.5 }}>
            Sections
          </Typography>
          <AnimatePresence initial={false}>
            {sections.map((section, i) => (
              <MotionBox
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{
                  opacity: 0
                }}
                key={section.id}
                sx={{
                  display: 'flex',
                  flexDirection: {
                    xs: 'column',
                    md: 'row'
                  },
                  gap: 1,
                  mb: i === sections.length - 1 ? 0 : 2
                }}
              >
                {i === 0 && (
                  <FormControl sx={{ flexGrow: 1 }}>
                    <Input
                      {...register(`sections.${i}.impedances.before`, {
                        valueAsNumber: true
                      })}
                      placeholder='Impedance before the section'
                      error={!!errors.sections?.[i].impedances?.before}
                      endDecorator={
                        <>
                          <Divider orientation='vertical' />
                          <Typography sx={{ ml: 1.5 }}>Ω</Typography>
                        </>
                      }
                    />
                    {!!errors.sections?.[i].impedances?.before && (
                      <FormHelperText>
                        {errors.sections?.[i]?.impedances?.before?.message}
                      </FormHelperText>
                    )}
                  </FormControl>
                )}
                <FormControl sx={{ flexGrow: 1 }}>
                  <Input
                    {...register(`sections.${i}.impedances.after`)}
                    placeholder='Impedance after the section'
                    error={!!errors.sections?.[i].impedances?.after}
                    endDecorator={
                      <>
                        <Divider orientation='vertical' />
                        <Typography sx={{ ml: 1.5 }}>Ω</Typography>
                      </>
                    }
                  />
                  {!!errors.sections?.[i].impedances?.after && (
                    <FormHelperText>
                      {errors.sections?.[i]?.impedances?.after?.message}
                    </FormHelperText>
                  )}
                </FormControl>
                {i > 0 && (
                  <>
                    <FormControl sx={{ flexGrow: 1 }}>
                      <Input
                        {...register(`sections.${i}.length`, {
                          value: i === 0 ? 10 : undefined,
                          valueAsNumber: true
                        })}
                        placeholder='Length'
                        // @ts-expect-error
                        error={!!errors.sections?.[i]?.length}
                        endDecorator={
                          <>
                            <Divider orientation='vertical' />
                            <Typography sx={{ ml: 1.5 }}>m</Typography>
                          </>
                        }
                      />
                      {/* @ts-expect-error */}
                      {!!errors.sections?.[i]?.length && (
                        <FormHelperText>
                          {/* @ts-expect-error */}
                          {errors.sections?.[i]?.length?.message}
                        </FormHelperText>
                      )}
                    </FormControl>
                    <FormControl sx={{ flexGrow: 1 }}>
                      <Input
                        {...register(`sections.${i}.velocity`, {
                          value: i === 0 ? 10 : undefined,
                          valueAsNumber: true
                        })}
                        placeholder='Velocity'
                        // @ts-expect-error
                        error={!!errors.sections?.[i]?.velocity}
                        endDecorator={
                          <>
                            <Divider orientation='vertical' />
                            <Typography sx={{ ml: 1.5 }}>m/µs</Typography>
                          </>
                        }
                      />
                      {/* @ts-expect-error */}
                      {!!errors.sections?.[i]?.velocity && (
                        <FormHelperText>
                          {/* @ts-expect-error */}
                          {errors.sections?.[i]?.velocity?.message}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </>
                )}
                <Button
                  type='button'
                  onClick={() => remove(i)}
                  disabled={sections.length === 1}
                  color='danger'
                >
                  <MdDelete size={20} />
                </Button>
              </MotionBox>
            ))}
          </AnimatePresence>
          <Button
            type='button'
            startDecorator={<MdAdd size={24} />}
            color='success'
            onClick={addSection}
            sx={{ mt: 2, mb: 1 }}
          >
            Add section
          </Button>
          <div>
            <Button
              startDecorator={<MdCalculate size={22} />}
              type='submit'
              // size='lg'
            >
              Calculate
            </Button>
          </div>
        </form>
        {resutls?.voltageResults.map((data, index) => (
          <Box key={index} sx={{ mt: 2 }}>
            <Typography level='h4'>Junction {index + 1}</Typography>
            <ResponsiveContainer height={300} className='mt-4'>
              <LineChart
                height={300}
                data={data}
                margin={{
                  top: 5,
                  right: 0,
                  left: 0,
                  bottom: 5
                }}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis
                  dataKey='time'
                  // label={{
                  //   value: `Junction ${index + 1}`,
                  //   position: 'insideBottomLeft',
                  //   offset: -10
                  // }}
                  type='number'
                  // domain={[0, 'dataMax + 1']}
                  unit='µs'
                  // tickCount={getValues('time')}
                />
                <YAxis
                // domain={[0, dataMax => Math.round(dataMax + 15)]}
                />
                <Tooltip
                  formatter={(value, name, item) => [
                    (value as number).toFixed(2) + ' KV',
                    'voltage'
                  ]}
                  labelFormatter={label =>
                    `time: ${new Intl.NumberFormat('en-US', {
                      style: 'unit',
                      unit: 'microsecond'
                    }).format(label)}`
                  }
                />
                <Legend />
                <Line dataKey='voltage' type='stepAfter' />
              </LineChart>
            </ResponsiveContainer>
            {resutls.currentResults[index].map((branchData, branchIndex) => (
              <ResponsiveContainer
                height={300}
                className='mt-4'
                key={branchIndex}
              >
                <LineChart
                  height={300}
                  data={branchData}
                  margin={{
                    top: 5,
                    right: 0,
                    left: 0,
                    bottom: 5
                  }}
                >
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis
                    dataKey='time'
                    // label={{
                    //   value: `Junction ${index + 1}`,
                    //   position: 'insideBottomLeft',
                    //   offset: -10
                    // }}
                    type='number'
                    // domain={[0, 'dataMax + 1']}
                    unit='µs'
                    // tickCount={getValues('time')}
                  />
                  <YAxis
                  // domain={[0, dataMax => Math.round(dataMax + 15)]}
                  />
                  <Tooltip
                    formatter={(value, name, item) => [
                      (value as number).toFixed(2) + ' A',
                      'current'
                    ]}
                    labelFormatter={label =>
                      `time: ${new Intl.NumberFormat('en-US', {
                        style: 'unit',
                        unit: 'microsecond'
                      }).format(label)}`
                    }
                  />
                  <Legend />
                  <Line dataKey='current' type='stepAfter' />
                </LineChart>
              </ResponsiveContainer>
            ))}
          </Box>
        ))}
      </Container>
    </Layout>
  )
}

export default IndexPage
